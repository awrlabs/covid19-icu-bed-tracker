import { createSlice } from '@reduxjs/toolkit'

const initState = {
    activeOrgUnit: null
}

const appSlice = createSlice({
    name: "app",
    initialState: initState,
    reducers: {
        setActiveOrgUnit(state, action){
            state.activeOrgUnit = action.payload;
        }
    }
})

export const { setActiveOrgUnit } = appSlice.actions;
export default appSlice.reducer;