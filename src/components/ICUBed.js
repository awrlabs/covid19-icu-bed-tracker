import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom'
import { Popper, ScreenCover } from '@dhis2/ui-core';
import { hasPerm, ACTIONS } from './permissionUtils';

export default function ICUBed({ 
    name, status, onView, onOccupy, onDischarge, onReserve, hasEventPerm, onViewPatient, hasEditPerm }){

    const ref = useRef(null);
    const [open, setOpen] = useState(false);

    const getClassName = () => {
        if(status === "AVAILABLE"){
            return "available";
        }

        if(status === "OCCUPIED"){
            return "occupied";
        }

        if(status === "RESERVED"){
            return "reserved";
        }

        return "";
    }

    const onToggle = () => {
        if(hasEventPerm){
            setOpen(!open);
        }
    }

    return (
        <div className={`icu-bed ${getClassName()}`} ref={ref} onClick={onToggle}>
            <span>{name}</span>
            {open && 
                createPortal(
                    <ScreenCover onClick={onToggle} transparent>
                        <Popper
                            placement="right"
                            reference={ref}
                        >
                            <div className="bed-options">
                                { (status === "AVAILABLE" || status === "RESERVED") &&
                                    <div onClick={() => { setOpen(false); onOccupy()}}>Occupy</div>
                                }
                                { status === "AVAILABLE" &&
                                    <div onClick={() => { setOpen(false); onReserve()}}>Reserve</div>
                                }
                                { status !== "AVAILABLE" &&
                                    <div onClick={() => { setOpen(false); onDischarge()}}>Discharge</div>
                                }
                                <div onClick={onView}>View</div>
                                { hasEditPerm && (status === "OCCUPIED" || status === "RESERVED") &&
                                    <div onClick={onViewPatient}>View Patient</div>
                                }
                            </div>
                        </Popper>
                    </ScreenCover>,
                    document.body
                )
            }
        </div>
    )
}