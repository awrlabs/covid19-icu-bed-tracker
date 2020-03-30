import { createSlice } from '@reduxjs/toolkit'

const initState = {
    activeUser: null,
    activeOrgUnit: null,
    activeICU: null,
    metaData: null,
    icuList: [],
    ICUEventId: "fKXrko0yhua"
}

const appSlice = createSlice({
    name: "app",
    initialState: initState,
    reducers: {
        setActiveOrgUnit(state, action){
            state.activeOrgUnit = action.payload;
        },
        setActiveICU(state, action){
            state.activeICU = action.payload;
        },
        setActiveUser(state, action){
            state.activeUser = action.payload;
        },
        setMetaData(state, action){
            state.metaData = action.payload
        },
        setICUBeds(state, action){
            if(state.activeICU && state.activeICU.id === action.payload.icuId){
                state.activeICU.beds = action.payload.beds;
            }
        },
        updateBedStatus(state, action){
            const bedIndex = state.activeICU.beds.findIndex(b => b.trackedEntityInstance === action.payload.bedId);
            if(bedIndex > -1){
                state.activeICU.beds[bedIndex].status = action.payload.status;
                state.activeICU.beds[bedIndex].lastEvent = action.payload.lastEvent;    
            }            
        },
        updateFilteredICUList(state, action){
            state.icuList = action.payload;
        },
        updateICUStat(state, action){
            const icuIndex = state.icuList.findIndex(i => i.id === action.payload.icuId);
            if(icuIndex > -1){
                state.icuList[icuIndex].available = action.payload.stat.available;
                state.icuList[icuIndex].total = action.payload.stat.total;
                state.icuList[icuIndex].name = action.payload.icuName;
            }            
        },
        updateICUDistance(state, action){
            const icuIndex = state.icuList.findIndex(i => i.id === action.payload.icuId);
            if(icuIndex > -1){
                state.icuList[icuIndex].distance = action.payload.distance;
            }            
        }
    }
})

export const { setActiveOrgUnit, setActiveICU, setMetaData, setICUBeds, 
               updateBedStatus, updateFilteredICUList, updateICUStat,
               setActiveUser, updateICUDistance
            } = appSlice.actions;
export default appSlice.reducer;