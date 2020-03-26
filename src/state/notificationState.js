
import { createSlice } from '@reduxjs/toolkit'

const initState = {
    isOpen: false,
    message: null,
    type: null,
};


const notificationSlice = createSlice({
    name: "notification",
    initialState: initState,
    reducers: {
        showNotification(state, action){
            state.isOpen = true
            state.message = action.payload.message
            state.type = action.payload.type
        },
        hideNotification(state, action){
            state,isOpen = false
            state.message = null
            state.type = null

        }
    }
})

export default notificationSlice.reducer;
export const {showNotification, hideNotification} = notificationSlice.actions; 