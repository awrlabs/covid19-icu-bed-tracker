import { setICUBeds, setMetaData, updateBedStatus, updateICUStat, setActiveUser } from './appState';
import * as moment from 'moment';
import { showNotification } from './notificationState'

const ICU_EVENT = "ICU - Bed Event";

export function test() {
    return async (dispatch, getState, dhisEngine) => {
        console.log(dhisEngine);
    }
}

function bedEventHelper(metaData, eventType){
    let dataValue = {};
    if(eventType === "Discharged"){
        dataValue = {
            dataElement: metaData[ICU_EVENT].id,
            value: "Discharged"
        }
    }else if(eventType === "Admitted"){
        dataValue = {
            dataElement: metaData[ICU_EVENT].id,
            value: "Admitted"
        }
    }else if(eventType === "Reserved"){
        dataValue = {
            dataElement: metaData[ICU_EVENT].id,
            value: "Reserved"
        }
    }

    return dataValue;
}

function getEventStatus(event){
    if(event.dataValues.length > 0){
        switch(event.dataValues[0].value){
            case "Discharged":
                return "AVAILABLE";
            
            case "Admitted":
                return "OCCUPIED";
            
            case "Reserved":
                return "RESERVED";
        }
    }

    return "";
}

export function getActiveUser(){
    return async (dispatch, getState, dhisEngine) => {
        try{
            const query = {
                user: {
                    resource: 'me',
                    params: {
                        fields: "id,displayName,userGroups,organisationUnits"
                    }
                }
            }
            const { user } = await dhisEngine.query(query);
            dispatch(setActiveUser({
                id: user.id,
                name: user.displayName,
                group: user.userGroups.length > 0 ? user.userGroups[0].id : null,
                organisationUnits: user.organisationUnits.map(ou => ou.id)
            }))
        }catch(error){
            dispatch(showNotification({
                message:'Error loading user',
                type:'error'
            }))
            console.log("Error in query:", error)
        }
    }
}

export function getMetaData(){
    return async (dispatch, getState, dhisEngine) => {
        try{
            
            const query = {
                program: {
                    resource: 'programs/C1wTfmmMQUn',
                    params: {
                        fields: "id,name,userGroupAccesses,trackedEntityType[id, displayName, userGroupAccesses, trackedEntityTypeAttributes[trackedEntityAttribute[id, displayName, formName, valueType, optionSet[options[displayName, id, code]]]]]"
                    },
                },
                dataElements: {
                    resource: 'dataElements',
                    params: {
                        paging: "false",
                        program: "C1wTfmmMQUn",
                        fields: "id,displayName,optionSet[options[id, displayName,code]]"
                    },
                }
            }
            const { program, dataElements } = await dhisEngine.query(query);
            console.log(program);
            let metaData = {
                id: program.id,
                name: program.name,
                trackedEntityType: {
                    id: program.trackedEntityType.id,
                    displayName: program.trackedEntityType.displayName,
                    trackedEntityTypeAttributes: []
                }
            };

            let programAccess = {};
            for(var ga of program.userGroupAccesses){
                programAccess[ga.userGroupUid] = {
                    canRead: ga.access.startsWith("rw"),
                    canWrite: ga.access.startsWith("rwrw")
                }
            }
            metaData['programAccess'] = programAccess;

            for(var attrib of program.trackedEntityType.trackedEntityTypeAttributes){
                metaData.trackedEntityType.trackedEntityTypeAttributes.push(attrib.trackedEntityAttribute);
            }

            let teAccess = {};
            for(var ga of program.trackedEntityType.userGroupAccesses){
                teAccess[ga.userGroupUid] = {
                    canRead: ga.access.startsWith("rw"),
                    canWrite: ga.access.startsWith("rwrw")
                }
            }
            metaData.trackedEntityType['access'] = teAccess;

            let _dataElements = {};

            for(var de of dataElements.dataElements){
                if(de.displayName.startsWith("ICU")){
                    let elem = {
                        id: de.id,
                        displayName: de.displayName
                    }

                    if(de.optionSet){
                        elem["options"] = de.optionSet.options;
                    }

                    _dataElements[de.displayName] = elem;
                }
            }

            metaData["dataElements"] = _dataElements;
            dispatch(setMetaData(metaData));
        }catch(error){
            dispatch(showNotification({
                message:'failed to load metadata',
                type:'error'
            }))
            console.log("Error in query:", error)
        }
    }
}


export function getICUBeds(icuId, program){
    return async (dispatch, getState, dhisEngine) => {
        try{
            const query = {
                results: {
                    resource: 'trackedEntityInstances',
                    params: {
                        ou: icuId,
                        fields: "trackedEntityInstance,attributes[attribute,displayName,value],enrollments",
                        program: program
                    },
                }
            }
            const response = await dhisEngine.query(query);

            const beds = response.results.trackedEntityInstances;
            // now get status of each
            for(var bed of beds){
                dispatch(getBedStatus(bed.trackedEntityInstance));
            }            
            dispatch(setICUBeds({
                icuId,
                beds
            }));
        }catch(error){
            dispatch(showNotification({
                message:'failed to load icu bed data',
                type:'error'
            }))
            console.log("Error in query:", error)
        }
    }
}

export function getBedStatus(instanceId){
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

        if(events.length > 0){
            const lastEvent = events[0];
            const bedEventIndex = lastEvent.dataValues.findIndex(dv => dv.dataElement === getState().app.metaData.dataElements[ICU_EVENT].id);
            
            if(bedEventIndex > -1){
                switch(lastEvent.dataValues[bedEventIndex].value){
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
                status: status,
                lastEvent: lastEvent
            }))
        }
    }
}

export function createBed(teID, icuId, programId, attributes){
    return async (dispatch, getState, dhisEngine) => {
        try{
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

            // add new event to make the bed available
            dispatch(addBedEvent(instanceId, programId, getState().app.ICUEventId, icuId, "Discharged"));
            dispatch(getICUBeds(icuId, programId));
        }catch(error){
            dispatch(showNotification({
                message:'error in creating bed',
                type:'error'
            }))
            console.log("Error in creating:", error)
        }
    }
}

export function updateBed(icuId, bedId, attributes){
    return async (dispatch, getState, dhisEngine) => {
        try{
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
        }catch(error){
            dispatch(showNotification({
                message:'error in updating bed',
                type:'error'
            }))
            console.log("Error in creating:", error)
        }
    }
}

export function removeBed(icuId, enrollmentId){
    return async (dispatch, getState, dhisEngine) => {
        try{
            const payload = {};
            const mutation = {
                resource: 'enrollments/' + enrollmentId, 
                type: 'delete'
            };
            const response = await dhisEngine.mutate(mutation);
            dispatch(getICUBeds(icuId, getState().app.metaData.id));
        }catch(error){
            dispatch(showNotification({
                message:'error in deleting bed',
                type:'error'
            }))
            console.log("Error in creating:", error)
        }
    }
}

export function addBedEvent(teId, programId, programStageId, icuId, eventType, additionalData=[]){
    return async (dispatch, getState, dhisEngine) => {
        try{
            // first we complete last event
            const query  = {
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
            if(eventResponse.events.events.length > 0){
                const lastEvent = eventResponse.events.events[0];
                const updatePayload = {
                    "event": lastEvent.event,
                    "trackedEntityInstance": teId,
                    "program": programId,
                    "programStage": programStageId,
                    "enrollment": icuId,
                    "orgUnit": icuId,
                    "completedDate": moment().format("YYYY-MM-DD"),
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
                "eventDate": moment().format("YYYY-MM-DD"),
                "status": "ACTIVE"
            };
            const mutation = {
                resource: 'events',
                type: 'create',
                data: payload
            };
            const response = await dhisEngine.mutate(mutation);
            dispatch(getBedStatus(teId));
        }catch(error){
            dispatch(showNotification({
                message:'error in adding bed event',
                type:'error'
            }))
            console.log("Error in creating:", error)
        }
    }
}

export function getICUStat(icu, filters = { }){
    return async (dispatch, getState, dhisEngine) => {
        try{
            let filtersQuery = "";
            for(var filter in filters){
                if(filters[filter].length === 0){
                    continue;
                }
                const values = filters[filter].map(f => f.value);
                filtersQuery += `${filter}:IN:${values.join(";")},`
            }
            filtersQuery = filtersQuery.substr(0, filtersQuery.length - 1);
            // first we complete last event
            const query  = {
                events: {
                    resource: 'events',
                    params: {
                        orgUnit: icu.id,
                        paging: "false",
                        status: "ACTIVE"
                    }
                },
                filteredTEI: {
                    resource: 'trackedEntityInstances',
                    params: {
                        ou: icu.id,
                        paging: 'false',
                        fields: 'trackedEntityInstance',
                        filter: filtersQuery
                    }                    
                }
            }
            const response = await dhisEngine.query(query);
            let stat = {
                available: 0,
                total: 0
            };

            for(var event of response.events.events){
                let teIndex = response.filteredTEI.trackedEntityInstances.findIndex(te => te.trackedEntityInstance === event.trackedEntityInstance);

                if(teIndex === -1){
                    // filtered TE doesn't have this
                    continue;
                }

                let status = getEventStatus(event);

                if(status === "AVAILABLE"){
                    stat.available++;
                }

                stat.total++;
            }

            dispatch(updateICUStat({
                icuId: icu.id,
                stat: stat
            }))
        }catch(error){
            dispatch(showNotification({
                message:'error in retrieving ICU status',
                type:'error'
            }))
            console.log("Error in creating:", error)
        }
    }
}