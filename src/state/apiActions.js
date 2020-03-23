import { setICUBeds } from './appState';
import * as moment from 'moment';

export function test() {
    return async (dispatch, getState, dhisEngine) => {
        console.log(dhisEngine);
    }
}

export function getICUBeds(icuId){
    return async (dispatch, getState, dhisEngine) => {
        try{
            const query = {
                results: {
                    resource: 'trackedEntityInstances',
                    params: {
                        ou: icuId,
                        fields: "trackedEntityInstance,attributes[attribute,displayName,value]"
                    },
                }
            }
            const response = await dhisEngine.query(query);
            
            dispatch(setICUBeds({
                icuId,
                beds: response.results.trackedEntityInstances
            }));
        }catch(error){
            console.log("Error in query:", error)
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
            dispatch(getICUBeds(icuId));
        }catch(error){
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
            dispatch(getICUBeds(icuId));
        }catch(error){
            console.log("Error in creating:", error)
        }
    }
}