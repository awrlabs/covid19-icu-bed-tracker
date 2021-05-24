import React, { useEffect, useState, useRef, useMemo } from 'react';
import { DataQuery, useDataQuery, useDataEngine } from '@dhis2/app-runtime'
import { createPortal } from 'react-dom'
import { Popper, ScreenCover } from '@dhis2/ui-core';
import { hasPerm, ACTIONS } from './permissionUtils';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faProcedures } from '@fortawesome/free-solid-svg-icons';
import { getLastEvent } from './DataStore';
import { DATA_ELEMENT_TEI_ID, PATIENT_ATT_BHT, PROGRAM_PATIENTS } from '../constants';

export default function ICUBed({
    name, status, onView, onOccupy, onDischarge, onReserve, hasEventPerm, onViewPatient, onStatusChange, hasEditPerm, bedId }) {

    const ref = useRef(null);
    const [open, setOpen] = useState(false);
    const [bht, setBHT] = useState("");
    const patientId = useMemo(() => {
        let lastEvent = getLastEvent(bedId);
        if (status === "OCCUPIED" && lastEvent) {
            let foundTeiId = lastEvent.dataValues.find(de => de.dataElement === DATA_ELEMENT_TEI_ID);
            if (foundTeiId) {
                return foundTeiId.value;
            }
        }
    }, [bedId, status]);
    const engine = useDataEngine();

    useEffect(() => {
        if (patientId) {
            engine.query({
                trackedEntityInstance: {
                    resource: 'trackedEntityInstances/' + patientId + '.json',
                    params: {
                        fields: 'attributes',
                        program: PROGRAM_PATIENTS
                    }
                }
            }).then(trackedEntityInstance => {
                if (trackedEntityInstance?.trackedEntityInstance?.attributes) {
                    let foundBht = trackedEntityInstance.trackedEntityInstance.attributes.find(ta => ta.attribute === PATIENT_ATT_BHT);
                    setBHT(foundBht ? foundBht.value : "N/A");
                }
            });
        }
    }, [patientId]);

    const getClassName = () => {
        if (status === "AVAILABLE") {
            return "available";
        }

        if (status === "OCCUPIED") {
            return "occupied";
        }

        if (status === "RESERVED") {
            return "reserved";
        }

        return "";
    }

    const onToggle = () => {
        if (hasEventPerm) {
            setOpen(!open);
        }
    }

    return (
        <div className={`icu-bed ${getClassName()}`} ref={ref} onClick={onToggle}>
            <FontAwesomeIcon
                icon={faProcedures}
                size="lg"
            />
            <span>{name}</span>
            {
                status == "OCCUPIED" ? <span>{bht}</span> : <span>&nbsp;</span>
            }

            {open &&
                createPortal(
                    <ScreenCover onClick={onToggle} transparent>
                        <Popper
                            placement="right"
                            reference={ref}
                        >
                            <div className="bed-options">
                                {(status === "AVAILABLE" || status === "RESERVED") &&
                                    <div onClick={() => { setOpen(false); onOccupy() }}>Occupy</div>
                                }
                                {status === "AVAILABLE" &&
                                    <div onClick={() => { setOpen(false); onReserve() }}>Reserve</div>
                                }
                                {status !== "AVAILABLE" &&
                                    <div onClick={() => { setOpen(false); onDischarge() }}>Discharge</div>
                                }
                                <div onClick={onView}>View Bed</div>
                                {hasEditPerm && (status === "OCCUPIED" || status === "RESERVED") &&
                                    <div onClick={onViewPatient}>Manage Patient</div>
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