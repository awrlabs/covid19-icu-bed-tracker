import { configureStore, combineReducers } from "@reduxjs/toolkit";
import appReducer from './appState';

const rootReducer = combineReducers({
    app: appReducer
})

export const store = configureStore({
    reducer: rootReducer
})