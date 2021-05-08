import React, { useState, useEffect } from 'react';
import {
    Modal, ModalTitle, ModalActions, ModalContent, ButtonStrip, Button,
    InputField, SingleSelect, RadioGroup, Radio, RadioGroupField, SingleSelectOption, SingleSelectField,
    Checkbox
} from '@dhis2/ui-core';
import { addBedEvent } from '../state/apiActions';
import { useSelector, useDispatch } from 'react-redux';
import { PATIENT_ATTRIBUTES, STATUS_ATTRIBUTES } from '../constants';
import { getLastEvent } from './DataStore';

export default function RegisterPatientModal({ open, onClose, selectedBed, actionType, editable }) {

    const [formState, setFormState] = useState({});
    const dispatch = useDispatch();

    const metaData = useSelector(state => state.app.metaData);
    const programStage = useSelector(state => state.app.ICUEventId);
    const activeICU = useSelector(state => state.app.activeICU);

    const attributesSet = actionType == "status" ? STATUS_ATTRIBUTES : PATIENT_ATTRIBUTES;

    const lastEvent = selectedBed.lastEvent || getLastEvent(selectedBed.trackedEntityInstance);

    console.log("LE", lastEvent);

    useEffect(() => {
        let _formState = {};
        for (var fieldId of attributesSet) {
            const field = Object.values(metaData.dataElements).find(de => de.id === fieldId);
            if (field.type === "TEXT") {
                if (!editable && lastEvent) {
                    _formState[field.id] = lastEvent.dataValues.find(dv => dv.dataElement === field.id).value;
                } else {
                    _formState[field.id] = "";
                }
            } else if (field.type === "BOOLEAN") {
                if (!editable && lastEvent) {
                    let lastValue = lastEvent.dataValues.find(dv => dv.dataElement === field.id);
                    // below condition looks stupid, but required
                    _formState[field.id] = lastValue != undefined ? (lastValue.value === 'true' || lastValue.value === true) : false;
                } else {
                    _formState[field.id] = false;
                }
            }
        }
        setFormState(_formState);
    }, [selectedBed]);

    const updateField = (field, value) => {
        console.log(field, value);
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
        } else if (field.type == "BOOLEAN") {
            return (
                <Checkbox
                    key={key}
                    label={field.formName}
                    name={field.id}
                    onChange={(val) => updateField(field.id, val.checked)}
                    checked={formState[field.id]} />
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

        console.log("Sending event", dataValues, formState);

        if (actionType === "admit" || actionType === "status") {
            dispatch(addBedEvent(selectedBed.trackedEntityInstance, metaData.id, programStage, activeICU.id, "Admitted", dataValues));
        } else if (actionType === "reserve") {
            dispatch(addBedEvent(selectedBed.trackedEntityInstance, metaData.id, programStage, activeICU.id, "Reserved", dataValues));
        }
        onClose();
    }

    let modelTitle = "";
    let buttonText = "";

    if (editable) {
        if (actionType === "admit") {
            modelTitle = "Admit New Patient";
            buttonText = "Admit Patient";
        } else if (actionType === "reserve") {
            modelTitle = "Reserve For Patient";
            buttonText = "Reserve";
        }
    } else {
        modelTitle = "View Patient";

        if (actionType === "status") {
            modelTitle = "Change Status";
            buttonText = "Save";
        }
    }

    return (
        <Modal open>
            <ModalTitle>
                {modelTitle}
            </ModalTitle>
            <ModalContent>
                {attributesSet.map((attrib, key) => getFormField(attrib, key))}
            </ModalContent>
            <ModalActions>
                <ButtonStrip end>
                    <Button
                        onClick={onClose}
                        secondary
                        type="button">
                        Close
                    </Button>
                    {(editable || actionType === "status") ?
                        <Button
                            onClick={admitPatient}
                            primary
                            type="button">
                            {buttonText}
                        </Button> : null
                    }
                </ButtonStrip>
            </ModalActions>
        </Modal>
    )
}