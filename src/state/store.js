import { configureStore, combineReducers, getDefaultMiddleware } from "@reduxjs/toolkit";
import appReducer from './appState';
import notificationReducer from './notificationState'

export const rootReducer = combineReducers({
    app: appReducer,
    notification: notificationReducer
})

export const store = configureStore({
    reducer: rootReducer
})