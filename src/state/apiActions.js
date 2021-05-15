import { setICUBeds, setMetaData, updateBedStatus, updateICUStat, setActiveUser, updateActiveICUData, updateICUStatRequest } from './appState';
import * as moment from 'moment';
import { showNotification } from './notificationState'
import { ICU_EVENT_ID, PROGRAM, PROGRAM_PATIENTS, PROGRAM_STAGE_PATIENT_ADMIT, RELATIONSHIP_BED_PATIENT, PROGRAM_STAGE_PATIENT_DISCHARGE, DATA_ELEMENT_DISCHARGE_OUTCOME } from '../constants';
import { getBedsForIcu, swapLatestEvent, upsertBed, removeBed as removeCachedBed } from "../components/DataStore";

function bedEventHelper(metaData, eventType) {
    let dataValue = {};
    if (eventType === "Discharged") {
        dataValue = {
            dataElement: ICU_EVENT_ID,
            value: "Discharged"
        }
    } else if (eventType === "Admitted") {
        dataValue = {
            dataElement: ICU_EVENT_ID,
            value: "Admitted"
        }
    } else if (eventType === "Reserved") {
        dataValue = {
            dataElement: ICU_EVENT_ID,
            value: "Reserved"
        }
    }

    return dataValue;
}

export function getActiveUser() {
    return async (dispatch, getState, dhisEngine) => {
        try {
            const query = {
                user: {
                    resource: 'me',
                    params: {
                        fields: "id,displayName,userGroups,organisationUnits[id, geometry, level, parent[id, level,geometry]]"
                    }
                }
            }
            const { user } = await dhisEngine.query(query);

            let origin = null;
            let originId = "";
            if (user.organisationUnits && user.organisationUnits.length > 0) {
                if (user.organisationUnits[0].level === 5) {
                    let parentOu = user.organisationUnits[0].parent;
                    originId = parentOu.id;
                    origin = (parentOu.geometry
                        && parentOu.geometry.type === "Point") ?
                        parentOu.geometry.coordinates : null;
                }
            }

            dispatch(setActiveUser({
                id: user.id,
                name: user.displayName,
                group: user.userGroups.length > 0 ? user.userGroups.map(ug => ug.id) : null,
                organisationUnits: user.organisationUnits.map(ou => ou.id),
                origin,
                originId
            }))
        } catch (error) {
            dispatch(showNotification({
                message: 'Error loading user',
                type: 'error'
            }))
            console.error("Error in query:", error)
        }
    }
}

export function getMetaData() {
    function processProgram(metaData, program) {
        metaData.id = program.id;
        metaData.name = program.name;
        metaData.trackedEntityType = {
            id: program.trackedEntityType.id,
            displayName: program.trackedEntityType.displayName,
            trackedEntityTypeAttributes: []
        };

        let programAccess = {};
        for (var ga of program.userGroupAccesses) {
            programAccess[ga.userGroupUid] = {
                canRead: ga.access.startsWith("rw"),
                canWrite: ga.access.startsWith("rwrw")
            }
        }
        metaData['programAccess'] = programAccess;

        let attribsSet = new Set();

        for (var attrib of program.trackedEntityType.trackedEntityTypeAttributes) {
            metaData.trackedEntityType.trackedEntityTypeAttributes.push(attrib.trackedEntityAttribute);
            attribsSet.add(attrib.trackedEntityAttribute.id);
        }

        // merging TEI atts and Program Atts
        if (program.programTrackedEntityAttributes) {
            for (var attrib of program.programTrackedEntityAttributes) {
                if (!attribsSet.has(attrib.trackedEntityAttribute.id)) {
                    metaData.trackedEntityType.trackedEntityTypeAttributes.push(attrib.trackedEntityAttribute);
                }
            }
        }

        let teAccess = {};
        for (var ga of program.trackedEntityType.userGroupAccesses) {
            teAccess[ga.userGroupUid] = {
                canRead: ga.access.startsWith("rw"),
                canWrite: ga.access.startsWith("rwrw")
            }
        }
        metaData.trackedEntityType['access'] = teAccess;
    }

    return async (dispatch, getState, dhisEngine) => {
        try {

            const query = {
                programBeds: {
                    resource: 'programs/C1wTfmmMQUn',
                    params: {
                        fields: "id,name,userGroupAccesses,trackedEntityType[id, displayName, userGroupAccesses, trackedEntityTypeAttributes[trackedEntityAttribute[id, displayName, formName, valueType, optionSet[options[displayName, id, code]]]]]"
                    },
                },
                programPatients: {
                    resource: 'programs/T3NPzGcARCj',
                    params: {
                        fields: "id,name,userGroupAccesses,trackedEntityType[id, displayName, userGroupAccesses, trackedEntityTypeAttributes[trackedEntityAttribute[id, displayName, formName, valueType, optionSet[options[displayName, id, code]]]]],programTrackedEntityAttributes[trackedEntityAttribute[id, displayName, formName, valueType, optionSet[options[displayName, id, code]]]]"
                    },
                },
                dataElements: {
                    resource: 'dataElements',
                    params: {
                        paging: "false",
                        program: "C1wTfmmMQUn",
                        fields: "id,displayName,displayFormName,valueType,optionSet[options[id, displayName, code]]"
                    },
                }
            }
            const { programBeds, programPatients, dataElements } = await dhisEngine.query(query);
            let metaData = {
                beds: {},
                patients: {},
            };

            processProgram(metaData.beds, programBeds);
            processProgram(metaData.patients, programPatients);

            let _dataElements = {};

            for (var de of dataElements.dataElements) {
                if (de.displayName.startsWith("ICU")) {
                    let elem = {
                        id: de.id,
                        displayName: de.displayName,
                        formName: de.displayFormName,
                        type: de.valueType
                    }

                    if (de.optionSet) {
                        elem["options"] = de.optionSet.options;
                    }

                    _dataElements[de.displayName] = elem;
                }
            }

            metaData["dataElements"] = _dataElements;
            dispatch(setMetaData(metaData));
        } catch (error) {
            dispatch(showNotification({
                message: 'failed to load metadata',
                type: 'error'
            }))
            console.error("Error in query:", error)
        }
    }
}


export function getICUBeds(icuId, program) {
    return async (dispatch, getState, dhisEngine) => {
        try {

            const beds = getBedsForIcu(icuId);

            // now get status of each
            for (var bed of beds) {
                dispatch(getBedStatus(bed.trackedEntityInstance));
            }
            dispatch(setICUBeds({
                icuId,
                beds
            }));
        } catch (error) {
            dispatch(showNotification({
                message: 'failed to load icu bed data',
                type: 'error'
            }))
            console.error("Error in query:", error)
        }
    }
}

export function getBedStatus(instanceId) {
    return async (dispatch, getState, dhisEngine) => {
        const query = {
            events: {
                resource: 'events',
                params: {
                    trackedEntityInstance: instanceId,
                    paging: "false",
                    status: "ACTIVE"
                }
            }
        }

        const response = await dhisEngine.query(query);

        const events = response.events.events;
        let status = "";
        let lastEvent = {};

        if (events.length > 0) {
            const lastEvent = events[0];
            const bedEventIndex = lastEvent.dataValues.findIndex(dv => dv.dataElement === ICU_EVENT_ID);

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
            // dispatch(updateBedStatus({
            //     bedId: instanceId,
            //     status: status
            // }));
        } else {
            status = "AVAILABLE";
        }

        dispatch(updateBedStatus({
            bedId: instanceId,
            status: status
        }));
    }
}

export function createBed(teID, icuId, programId, attributes) {
    return async (dispatch, getState, dhisEngine) => {
        try {
            const payload = {
                "trackedEntityType": teID,
                "orgUnit": icuId,
                "attributes": attributes,
                "enrollments": [
                    {
                        "orgUnit": icuId,
                        "program": programId,
                        "enrollmentDate": moment().format("YYYY-MM-DD"),
                        "incidentDate": moment().format("YYYY-MM-DD")
                    }
                ]
            };
            const mutation = {
                resource: 'trackedEntityInstances',
                type: 'create',
                data: payload
            };
            const response = await dhisEngine.mutate(mutation);
            const instanceId = response.response.importSummaries[0].reference;

            // add to local storage
            upsertBed(instanceId, payload);

            // add new event to make the bed available
            dispatch(addBedEvent(instanceId, programId, getState().app.ICUEventId, icuId, "Discharged"));
            dispatch(getICUBeds(icuId, programId));
        } catch (error) {
            dispatch(showNotification({
                message: 'error in creating bed',
                type: 'error'
            }))
            console.error("Error in creating:", error)
        }
    }
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

            // update the local storage
            upsertBed(bedId, payload);

            dispatch(getICUBeds(icuId, getState().app.metaData.beds.id));
        } catch (error) {
            dispatch(showNotification({
                message: 'error in updating bed',
                type: 'error'
            }))
            console.error("Error in creating:", error)
        }
    }
}

export function removeBed(icuId, enrollmentId, teiId) {
    return async (dispatch, getState, dhisEngine) => {
        try {
            const payload = {
                status: "COMPLETED",
                enrollment: enrollmentId,
                orgUnit: icuId,
                trackedEntityInstance: teiId,
                program: PROGRAM
            };
            const mutation = {
                resource: 'enrollments/' + enrollmentId,
                type: 'update',
                data: payload
            };
            const response = await dhisEngine.mutate(mutation);
            removeCachedBed(teiId, true);
            dispatch(getICUBeds(icuId, getState().app.metaData.beds.id));
        } catch (error) {
            dispatch(showNotification({
                message: 'error in deleting bed',
                type: 'error'
            }))
            console.error("Error in completing bed enrollment:", error)
        }
    }
}

export function addBedEvent(teId, programId, programStageId, icuId, eventType, additionalData = [], eventDate = moment().format("YYYY-MM-DD")) {
    return async (dispatch, getState, dhisEngine) => {
        try {
            // first we complete last event
            const query = {
                events: {
                    resource: 'events',
                    params: {
                        trackedEntityInstance: teId,
                        paging: "false",
                        status: "ACTIVE"
                    }
                }
            }
            const eventResponse = await dhisEngine.query(query);
            if (eventResponse.events.events.length > 0) {
                const lastEvent = eventResponse.events.events[0];
                const updatePayload = {
                    "event": lastEvent.event,
                    "trackedEntityInstance": teId,
                    "program": programId,
                    "programStage": programStageId,
                    "enrollment": icuId,
                    "orgUnit": icuId,
                    "completedDate": eventDate,
                    "status": "COMPLETED"
                };
                const updateMutation = {
                    resource: 'events',
                    type: 'create',
                    data: updatePayload
                };
                await dhisEngine.mutate(updateMutation);
            }

            const dataValues = [
                bedEventHelper(getState().app.metaData.dataElements, eventType),
                ...additionalData
            ];
            const payload = {
                "trackedEntityInstance": teId,
                "program": programId,
                "programStage": programStageId,
                "enrollment": icuId,
                "orgUnit": icuId,
                "dataValues": dataValues,
                "eventDate": eventDate,
                "status": "ACTIVE"
            };
            const mutation = {
                resource: 'events',
                type: 'create',
                data: payload
            };
            const response = await dhisEngine.mutate(mutation);
            swapLatestEvent({
                trackedEntityInstance: teId,
                dataValues
            });
            dispatch(getBedStatus(teId));
        } catch (error) {
            dispatch(showNotification({
                message: 'error in adding bed event',
                type: 'error'
            }))
            console.error("Error in creating:", error)
        }
    }
}

export function getActiveICData(icuId) {
    return async (dispatch, getState, dhisEngine) => {
        try {
            const query = {
                organisationUnit: {
                    resource: 'organisationUnits/' + icuId,
                    params: {
                        fields: 'id,contactPerson,phoneNumber'
                    }
                }
            }
            const response = await dhisEngine.query(query);

            dispatch(updateActiveICUData({
                icuId: icuId,
                contactPerson: response.organisationUnit.contactPerson,
                contactNumber: response.organisationUnit.phoneNumber
            }))
        } catch (error) {
            dispatch(showNotification({
                message: 'error in retrieving ICU data',
                type: 'error'
            }))
            console.error("Error in creating:", error)
        }
    }
}

/*  PATIENT */
export function completePatientEnrollment(patientId, icuId, outcome, incidentDate) {
    return async (dispatch, getState, dhisEngine) => {
        try {
            // send discharge event
            dispatch(addPatientEvent(patientId, PROGRAM_PATIENTS, PROGRAM_STAGE_PATIENT_DISCHARGE, icuId, [{
                dataElement: DATA_ELEMENT_DISCHARGE_OUTCOME,
                value: outcome
            }]));

            const query = {
                enrollments: {
                    resource: 'enrollments',
                    params: {
                        trackedEntityInstance: patientId,
                        program: PROGRAM_PATIENTS,
                        ouMode: "ACCESSIBLE"
                    }
                }
            }
            const enrollmentResponse = await dhisEngine.query(query);
            if (enrollmentResponse.enrollments) {
                for (let en of enrollmentResponse.enrollments.enrollments) {
                    const payload = {
                        status: "COMPLETED",
                        enrollment: en.enrollment,
                        orgUnit: en.orgUnit,
                        trackedEntityInstance: en.trackedEntityInstance,
                        program: en.program,
                        completedDate: incidentDate
                    };
                    const mutation = {
                        resource: 'enrollments/' + en.enrollment,
                        type: 'update',
                        data: payload
                    };
                    const response = await dhisEngine.mutate(mutation);
                }
            }
        } catch (error) {
            dispatch(showNotification({
                message: 'error in completing patient enrollment',
                type: 'error'
            }))
            console.error("Error in completing patient enrollment:", error)
        }
    }
}

export function addBedPatientRelationship(bedId, patientId) {
    return async (dispatch, getState, dhisEngine) => {
        try {
            // first we complete last event
            const query = {
                resource: 'relationships',
                type: 'create',
                data: {
                    "relationshipType": RELATIONSHIP_BED_PATIENT,
                    "from": {
                        "trackedEntityInstance": {
                            "trackedEntityInstance": bedId
                        }
                    },
                    "to": {
                        "trackedEntityInstance": {
                            "trackedEntityInstance": patientId
                        }
                    }
                }
            }
            const response = await dhisEngine.mutate(query);
        } catch (error) {
            dispatch(showNotification({
                message: 'error in adding patient event',
                type: 'error'
            }))
            console.error("Error in creating:", error)
        }
    }
}

export function addPatientEvent(teId, programId, programStageId, icuId, dataValues = [], incidentDate = moment().format("YYYY-MM-DD")) {
    return async (dispatch, getState, dhisEngine) => {
        try {
            // first we complete last event
            const query = {
                events: {
                    resource: 'events',
                    params: {
                        trackedEntityInstance: teId,
                        paging: "false",
                        status: "ACTIVE"
                    }
                }
            }
            const eventResponse = await dhisEngine.query(query);
            for (let index = 0; index < eventResponse.events.events.length; index++) {
                const lastEvent = eventResponse.events.events[index];
                if (lastEvent.status !== "COMPLETED") {
                    const updatePayload = {
                        "event": lastEvent.event,
                        "trackedEntityInstance": lastEvent.trackedEntityInstance,
                        "program": lastEvent.program,
                        "programStage": lastEvent.programStage,
                        "enrollment": lastEvent.enrollment,
                        "orgUnit": lastEvent.orgUnit,
                        "completedDate": incidentDate,
                        "status": "COMPLETED"
                    };
                    const updateMutation = {
                        resource: 'events',
                        type: 'create',
                        data: updatePayload
                    };
                    await dhisEngine.mutate(updateMutation);
                }
            }

            const payload = {
                "trackedEntityInstance": teId,
                "program": programId,
                "programStage": programStageId,
                "orgUnit": icuId,
                "dataValues": dataValues,
                "eventDate": incidentDate,
                "status": "COMPLETED"
            };
            const mutation = {
                resource: 'events',
                type: 'create',
                data: payload
            };
            const response = await dhisEngine.mutate(mutation);
        } catch (error) {
            dispatch(showNotification({
                message: 'error in adding patient event',
                type: 'error'
            }))
            console.error("Error in creating:", error)
        }
    }
}

export function createPatient(teTypeID, icuId, programId, attributes, admitDataValues, incidentDate, cb, error_cb) {
    return async (dispatch, getState, dhisEngine) => {
        try {
            const payload = {
                "trackedEntityType": teTypeID,
                "orgUnit": icuId,
                "attributes": attributes,
                "enrollments": [
                    {
                        "orgUnit": icuId,
                        "program": programId,
                        "enrollmentDate": incidentDate,
                        "incidentDate": incidentDate
                    }
                ]
            };
            const mutation = {
                resource: 'trackedEntityInstances',
                type: 'create',
                data: payload
            };
            const response = await dhisEngine.mutate(mutation);
            const instanceId = response.response.importSummaries[0].reference;

            await dispatch(addPatientEvent(instanceId, programId, PROGRAM_STAGE_PATIENT_ADMIT, icuId, admitDataValues, incidentDate));
            cb(instanceId);
        } catch (error) {
            dispatch(showNotification({
                message: 'error in creating patient',
                type: 'error'
            }))
            console.error("Error in creating:", error)
            error_cb();
        }
    }
}