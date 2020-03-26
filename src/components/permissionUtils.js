export const ACTIONS = {
    VIEW_ICU : "VIEW_ICU",
    CONFIG_ICU : "CONFIG_ICU",
    ADD_EVENT : "ADD_EVENT"
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

    if(action === ACTIONS.CONFIG_ICU && activeUser.organisationUnits.indexOf(icuId) > -1){
        if(teAccess[activeUser.group] && teAccess[activeUser.group].canWrite){
            return true;
        }
    }

    if(action === ACTIONS.ADD_EVENT){
        if(programAccess[activeUser.group] && programAccess[activeUser.group].canWrite 
            && activeUser.organisationUnits.indexOf(icuId) > -1){
            return true;
        }
    }

    return false;
}