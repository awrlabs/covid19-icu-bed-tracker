import { parentMatrix } from "./OrgUnits";

export const ACTIONS = {
    VIEW_ICU : "VIEW_ICU",
    CONFIG_ICU : "CONFIG_ICU",
    ADD_EVENT : "ADD_EVENT"
}

// function to calculate if the parent has the child down the line
function isRelated(parent, child){
    while( parentMatrix[child] !== parent ){
        child = parentMatrix[child];

        if(!parentMatrix[child]){
            break;
        }
    }

    if(!parentMatrix[child] || parentMatrix[child] !== parent){
        return false;
    }

    return true;
}

function userHasOrgAccess(orgUnits, icuId){
    for(var orgUnit of orgUnits){
        if(orgUnit === icuId || isRelated(orgUnit, icuId)){
            return true;
        }
    }

    return false;
}

export function hasPerm(action, activeUser, programAccess, teAccess, icuId){
    if(activeUser.group === "LkEkMDG0zfj"){
        //super user
        return true;
    }
    
    if(action === ACTIONS.VIEW_ICU){
        if(teAccess[activeUser.group] && teAccess[activeUser.group].canRead){
            return true;
        }
    }

    if(action === ACTIONS.CONFIG_ICU && userHasOrgAccess(activeUser.organisationUnits, icuId)){
        if(teAccess[activeUser.group] && teAccess[activeUser.group].canWrite){
            return true;
        }
    }

    if(action === ACTIONS.ADD_EVENT){
        if(programAccess[activeUser.group] && programAccess[activeUser.group].canWrite 
            && userHasOrgAccess(activeUser.organisationUnits, icuId)){
            return true;
        }
    }

    return false;
}