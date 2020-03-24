import { setICUBeds, setMetaData, updateBedStatus } from './appState';
import * as moment from 'moment';
const ICU_EVENT = "ICU - Bed Event";
export function test() {
  return async (dispatch, getState, dhisEngine) => {
    console.log(dhisEngine);
  };
}

function bedEventHelper(metaData, eventType) {
  let dataValue = {};

  if (eventType === "Discharged") {
    dataValue = {
      dataElement: metaData[ICU_EVENT].id,
      value: "Discharged"
    };
  } else if (eventType === "Admitted") {
    dataValue = {
      dataElement: metaData[ICU_EVENT].id,
      value: "Admitted"
    };
  } else if (eventType === "Reserved") {
    dataValue = {
      dataElement: metaData[ICU_EVENT].id,
      value: "Reserved"
    };
  }

  return dataValue;
}

export function getMetaData() {
  return async (dispatch, getState, dhisEngine) => {
    try {
      const query = {
        program: {
          resource: 'programs/C1wTfmmMQUn',
          params: {
            fields: "id,name,trackedEntityType[id, displayName, trackedEntityTypeAttributes[trackedEntityAttribute[id, displayName, valueType, optionSet[options[displayName, id, code]]]]]"
          }
        },
        dataElements: {
          resource: 'dataElements',
          params: {
            paging: "false",
            program: "C1wTfmmMQUn",
            fields: "id,displayName,optionSet[options[id, displayName,code]]"
          }
        }
      };
      const {
        program,
        dataElements
      } = await dhisEngine.query(query);
      let metaData = {
        id: program.id,
        name: program.name,
        trackedEntityType: {
          id: program.trackedEntityType.id,
          displayName: program.trackedEntityType.displayName,
          trackedEntityTypeAttributes: []
        }
      };

      for (var attrib of program.trackedEntityType.trackedEntityTypeAttributes) {
        metaData.trackedEntityType.trackedEntityTypeAttributes.push(attrib.trackedEntityAttribute);
      }

      let _dataElements = {};

      for (var de of dataElements.dataElements) {
        if (de.displayName.startsWith("ICU")) {
          let elem = {
            id: de.id,
            displayName: de.displayName
          };

          if (de.optionSet) {
            elem["options"] = de.optionSet.options;
          }

          _dataElements[de.displayName] = elem;
        }
      }

      metaData["dataElements"] = _dataElements;
      dispatch(setMetaData(metaData));
    } catch (error) {
      console.log("Error in query:", error);
    }
  };
}
export function getICUBeds(icuId, program) {
  return async (dispatch, getState, dhisEngine) => {
    try {
      const query = {
        results: {
          resource: 'trackedEntityInstances',
          params: {
            ou: icuId,
            fields: "trackedEntityInstance,attributes[attribute,displayName,value],enrollments",
            program: program
          }
        }
      };
      const response = await dhisEngine.query(query);
      const beds = response.results.trackedEntityInstances; // now get status of each

      for (var bed of beds) {
        dispatch(getBedStatus(bed.trackedEntityInstance));
      }

      dispatch(setICUBeds({
        icuId,
        beds
      }));
    } catch (error) {
      console.log("Error in query:", error);
    }
  };
}
export function getBedStatus(instanceId) {
  return async (dispatch, getState, dhisEngine) => {
    const query = {
      events: {
        resource: 'events',
        params: {
          trackedEntityInstance: instanceId,
          paging: "false"
        }
      }
    };
    const response = await dhisEngine.query(query);
    const events = response.events.events;
    let status = "";

    if (events.length > 0) {
      const lastEvent = events[0];
      const bedEventIndex = lastEvent.dataValues.findIndex(dv => dv.dataElement === getState().app.metaData.dataElements[ICU_EVENT].id);

      if (bedEventIndex > -1) {
        switch (lastEvent.dataValues[bedEventIndex].value) {
          case "Discharged":
            status = "AVAILABLE";
            break;

          case "Admitted":
            status = "OCCUPIED";
            break;

          case "Reserved":
            status = "RESERVED";
            break;
        }
      }

      dispatch(updateBedStatus({
        bedId: instanceId,
        status: status
      }));
    }
  };
}
export function createBed(teID, icuId, programId, attributes) {
  return async (dispatch, getState, dhisEngine) => {
    try {
      const payload = {
        "trackedEntityType": teID,
        "orgUnit": icuId,
        "attributes": attributes,
        "enrollments": [{
          "orgUnit": icuId,
          "program": programId,
          "enrollmentDate": moment().format("YYYY-MM-DD"),
          "incidentDate": moment().format("YYYY-MM-DD")
        }]
      };
      const mutation = {
        resource: 'trackedEntityInstances',
        type: 'create',
        data: payload
      };
      const response = await dhisEngine.mutate(mutation);
      const instanceId = response.response.importSummaries[0].reference; // add new event to make the bed available

      dispatch(addBedEvent(instanceId, programId, getState().app.ICUEventId, icuId, "Discharged"));
      dispatch(getICUBeds(icuId, programId));
    } catch (error) {
      console.log("Error in creating:", error);
    }
  };
}
export function updateBed(icuId, bedId, attributes) {
  return async (dispatch, getState, dhisEngine) => {
    try {
      const payload = {
        "orgUnit": icuId,
        "attributes": attributes
      };
      const mutation = {
        resource: 'trackedEntityInstances/' + bedId,
        type: 'update',
        data: payload
      };
      const response = await dhisEngine.mutate(mutation);
      dispatch(getICUBeds(icuId, getState().app.metaData.id));
    } catch (error) {
      console.log("Error in creating:", error);
    }
  };
}
export function removeBed(icuId, enrollmentId) {
  return async (dispatch, getState, dhisEngine) => {
    try {
      const payload = {};
      const mutation = {
        resource: 'enrollments/' + enrollmentId,
        type: 'delete'
      };
      const response = await dhisEngine.mutate(mutation);
      dispatch(getICUBeds(icuId, getState().app.metaData.id));
    } catch (error) {
      console.log("Error in creating:", error);
    }
  };
}
export function addBedEvent(teId, programId, programStageId, icuId, eventType, additionalData = []) {
  return async (dispatch, getState, dhisEngine) => {
    try {
      const dataValues = [bedEventHelper(getState().app.metaData.dataElements, eventType), ...additionalData];
      const payload = {
        "trackedEntityInstance": teId,
        "program": programId,
        "programStage": programStageId,
        "enrollment": icuId,
        "orgUnit": icuId,
        "dataValues": dataValues,
        "status": "COMPLETED"
      };
      const mutation = {
        resource: 'events',
        type: 'create',
        data: payload
      };
      const response = await dhisEngine.mutate(mutation);
      dispatch(getBedStatus(teId));
    } catch (error) {
      console.log("Error in creating:", error);
    }
  };
}