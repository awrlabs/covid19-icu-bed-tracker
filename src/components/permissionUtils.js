import { ICUHasParent } from "./DataStore";
import { SUPER_ADMIN_GROUP } from "../constants";

export const ACTIONS = {
    VIEW_ICU: "VIEW_ICU",
    CONFIG_ICU: "CONFIG_ICU",
    ADD_EVENT: "ADD_EVENT"
}

// function to calculate if the parent has the child down the line
function isRelated(parent, child) {
    // while( parentMatrix[child] !== parent ){
    //     child = parentMatrix[child];

    //     if(!parentMatrix[child]){
    //         break;
    //     }
    // }

    // if(!parentMatrix[child] || parentMatrix[child] !== parent){
    //     return false;
    // }

    return ICUHasParent(parent, child);
}

function userHasOrgAccess(orgUnits, icuId) {
    for (var orgUnit of orgUnits) {
        if (orgUnit === icuId || isRelated(orgUnit, icuId)) {
            return true;
        }
    }

    return false;
}

function userHasGroupAccess(groups, accessGroups, accessType) {
    for (var userGroup of groups) {
        if (accessGroups[userGroup]) {
            if (accessType === "READ") {
                return accessGroups[userGroup].canRead;
            }
            if (accessType === "WRITE") {
                return accessGroups[userGroup].canWrite;
            }
        }
    }

    return false;
}

export function hasPerm(action, activeUser, programAccess, teAccess, icuId) {
    if (activeUser.group.indexOf(SUPER_ADMIN_GROUP) > -1) {
        //super user
        return true;
    }

    if (action === ACTIONS.VIEW_ICU) {
        if (userHasGroupAccess(activeUser.group, teAccess, "READ")) {
            return true;
        }
    }

    if (action === ACTIONS.CONFIG_ICU && userHasOrgAccess(activeUser.organisationUnits, icuId)) {
        if (userHasGroupAccess(activeUser.group, teAccess, "WRITE")) {
            return true;
        }
    }

    if (action === ACTIONS.ADD_EVENT) {
        if (userHasGroupAccess(activeUser.group, programAccess, "WRITE")
            && userHasOrgAccess(activeUser.organisationUnits, icuId)) {
            return true;
        }
    }

    return false;
}