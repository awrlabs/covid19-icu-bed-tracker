import { createSlice } from '@reduxjs/toolkit'

const initState = {
    // activeOrgUnit: null,
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
            state.activeICU = action.payload
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
            state.activeICU.beds[bedIndex].status = action.payload.status;
        },
        updateFilteredICUList(state, action){
            state.icuList = action.payload;
        },
        updateICUStat(state, action){
            const icuIndex = state.icuList.findIndex(i => i.id === action.payload.icuId);
            state.icuList[icuIndex].available = action.payload.stat.available;
            state.icuList[icuIndex].total = action.payload.stat.total;
        }
    }
})

export const { setActiveOrgUnit, setActiveICU, setMetaData, setICUBeds, updateBedStatus, updateFilteredICUList, updateICUStat } = appSlice.actions;
export default appSlice.reducer;