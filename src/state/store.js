import { configureStore, combineReducers, getDefaultMiddleware } from "@reduxjs/toolkit";
import appReducer from './appState';

export const rootReducer = combineReducers({
    app: appReducer
})

export const store = configureStore({
    reducer: rootReducer
})