import React, { useState, useEffect } from 'react';
import {
    Modal, ModalTitle, ModalActions, ModalContent, ButtonStrip, Button,
    InputField, SingleSelect, RadioGroup, Radio, RadioGroupField, SingleSelectOption, SingleSelectField,
    Checkbox
} from '@dhis2/ui-core';
import { addBedEvent } from '../state/apiActions';
import { useSelector, useDispatch } from 'react-redux';
import useConfirmation from './useConfirmationHook';
import { PATIENT_ATTRIBUTES } from '../constants';

const patientFieldset = [
    {
        type: "TEXT",
        label: "ICU - BHT Number",
        id: "j1hbO7zzRgV"
    },
    {
        type: "TEXT",
        label: "ICU - Patient Name",
        id: "sK09QRLNyAA"
    },
    {
        type: "TEXT",
        label: "ICU - Consultant In-charge",
        id: "malZQqUEzi9"
    },
    {
        type: "TEXT",
        label: "ICU - Patient Diagnosis",
        id: "qh9bc6jlauE"
    }
]

export default function RegisterPatientModal({ open, onClose, selectedBed, actionType, editable }) {

    const [formState, setFormState] = useState({});
    const dispatch = useDispatch();

    const metaData = useSelector(state => state.app.metaData);
    const programStage = useSelector(state => state.app.ICUEventId);
    const activeICU = useSelector(state => state.app.activeICU);

    const confirmation = useConfirmation();

    useEffect(() => {
        let _formState = {};
        for (var fieldId of PATIENT_ATTRIBUTES) {
            const field = Object.values(metaData.dataElements).find(de => de.id === fieldId);
            if (field.type === "TEXT") {
                if (!editable && selectedBed.lastEvent) {
                    _formState[field.id] = selectedBed.lastEvent.dataValues.find(dv => dv.dataElement === field.id).value;
                } else {
                    _formState[field.id] = "";
                }
            }
        }
        setFormState(_formState);
    }, [selectedBed]);

    const updateField = (field, value) => {
        setFormState({
            ...formState,
            [field]: value
        })
    }

    const getFormField = (attrib, key) => {
        const field = Object.values(metaData.dataElements).find(de => de.id === attrib);
        if (field.type === "TEXT") {
            return (
                <InputField
                    key={key}
                    label={field.formName}
                    name={field.id}
                    onChange={(val) => updateField(field.id, val.value)}
                    value={formState[field.id]}
                    disabled={!editable}
                />
            )
        }
    }

    const admitPatient = () => {
        let dataValues = [];
        for (var field in formState) {
            dataValues.push({
                dataElement: field,
                value: formState[field]
            })
        }

        if (actionType === "admit") {
            dispatch(addBedEvent(selectedBed.trackedEntityInstance, metaData.id, programStage, activeICU.id, "Admitted", dataValues));
        } else if (actionType === "reserve") {
            dispatch(addBedEvent(selectedBed.trackedEntityInstance, metaData.id, programStage, activeICU.id, "Reserved", dataValues));
        }
        onClose();
    }


    return (
        <Modal open>
            <ModalTitle>

                {editable &&
                    <span>{actionType === "admit" ? 'Admit' : 'Reserve'} New Patient</span>
                }
                {!editable &&
                    <span>View Patient</span>
                }

            </ModalTitle>
            <ModalContent>
                {PATIENT_ATTRIBUTES.map((attrib, key) => getFormField(attrib, key))}
            </ModalContent>
            <ModalActions>
                <ButtonStrip end>
                    <Button
                        onClick={onClose}
                        secondary
                        type="button"
                    >
                        Close
                    </Button>
                    {editable &&
                        <Button
                            onClick={admitPatient}
                            primary
                            type="button"
                        >
                            {actionType === "admit" ? 'Admit' : 'Reserve'} Patient
                        </Button>
                    }
                </ButtonStrip>
            </ModalActions>
        </Modal>
    )
}