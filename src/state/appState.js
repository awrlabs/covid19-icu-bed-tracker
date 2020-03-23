import { createSlice } from '@reduxjs/toolkit'

const initState = {
    // activeOrgUnit: null,
    activeOrgUnit: {
        id: 'G6u9F2eumqa',
        name: 'MOH - Manthai West',
        level: 4
    },
    activeICU: {
        id: "LZU2dcf423d",
        beds: []
    },
    metaData: null
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
        }
    }
})

export const { setActiveOrgUnit, setActiveICU, setMetaData, setICUBeds } = appSlice.actions;
export default appSlice.reducer;