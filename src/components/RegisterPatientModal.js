import React, { useState, useEffect } from 'react';
import {
    Modal, ModalTitle, ModalActions, ModalContent, ButtonStrip, Button,
    InputField, SingleSelect, RadioGroup, Radio, RadioGroupField, SingleSelectOption, SingleSelectField,
    Checkbox
} from '@dhis2/ui-core';
import { addBedEvent } from '../state/apiActions';
import { useSelector, useDispatch } from 'react-redux';
import { PATIENT_ATTRIBUTES, PATIENT_CLINICAL_PARAMETERS, PATIENT_FACILITY_UTLIZATION, PATIENT_SPECIALIZATION_UTLIZATION } from '../constants';
import { getLastEvent } from './DataStore';

export default function RegisterPatientModal({ open, onClose, selectedBed, actionType, editable }) {

    const [formState, setFormState] = useState({});
    const dispatch = useDispatch();

    const metaData = useSelector(state => state.app.metaData);
    const programStage = useSelector(state => state.app.ICUEventId);
    const activeICU = useSelector(state => state.app.activeICU);

    const bedDataValuesSet = PATIENT_ATTRIBUTES;

    const patientAttsSet = metaData.patients.trackedEntityType.trackedEntityTypeAttributes;

    console.log("PAT ATT", patientAttsSet, metaData);

    const lastBedEvent = selectedBed.lastEvent || getLastEvent(selectedBed.trackedEntityInstance);

    useEffect(() => {
        let _formState = {};
        for (var fieldId of bedDataValuesSet) {
            const field = Object.values(metaData.dataElements).find(de => de.id === fieldId);
            if (field.type === "TEXT") {
                if (!editable && lastBedEvent) {
                    _formState[field.id] = lastBedEvent.dataValues.find(dv => dv.dataElement === field.id).value;
                } else {
                    _formState[field.id] = "";
                }
            } else if (field.type === "BOOLEAN") {
                if (!editable && lastBedEvent) {
                    let lastValue = lastBedEvent.dataValues.find(dv => dv.dataElement === field.id);
                    // below condition looks stupid, but required
                    _formState[field.id] = lastValue != undefined ? (lastValue.value === 'true' || lastValue.value === true) : false;
                } else {
                    _formState[field.id] = false;
                }
            }
        }
        setFormState(_formState);
    }, [selectedBed, metaData]);

    const updateField = (field, value) => {
        setFormState({
            ...formState,
            [field]: value
        })
    }

    const getFormField = (field) => {
        if (field.type === "TEXT" || field.type == "INTEGER_ZERO_OR_POSITIVE") {
            if (field.options) {
                return (
                    <SingleSelectField
                        key={field.id}
                        label={field.formName}
                        name={field.id}
                        onChange={(val) => updateField(field.id, val.selected)}
                        selected={formState[field.id]}
                        disabled={!editable}>
                        {field.options.map((sel, key) =>
                            <SingleSelectOption key={key} label={sel.displayName} value={sel.code} />
                        )}
                    </SingleSelectField>
                )
            }
            return (
                <InputField
                    key={field.id}
                    label={field.formName}
                    name={field.id}
                    onChange={(val) => updateField(field.id, val.value)}
                    value={formState[field.id]}
                    type={field.type === "TEXT" ? "string" : "number"}
                    disabled={!editable} />
            )
        } else if (field.type == "BOOLEAN") {
            return (
                <Checkbox
                    key={field.id}
                    label={field.formName}
                    name={field.id}
                    onChange={(val) => updateField(field.id, val.checked)}
                    checked={formState[field.id]} />
            )
        }
    }

    const getDataValueFormField = (attrib) => {
        const field = Object.values(metaData.dataElements).find(de => de.id === attrib);
        return getFormField(field);
    }

    const getPatientFormFields = (attrib) => {
        return getFormField({
            id: attrib.id,
            formName: attrib.displayName,
            type: attrib.valueType,
            options: attrib.optionSet && attrib.optionSet.options
        });
    };

    const admitPatient = () => {
        let bedEventDataValues = [];
        for (var field in formState) {
            if (PATIENT_ATTRIBUTES.indexOf(field) > 0) {
                bedEventDataValues.push({
                    dataElement: field,
                    value: formState[field]
                });
            }
        }

        let admitEventDataValues = [];
        



        console.log("Sending event", bedEventDataValues, formState);

        if (actionType === "admit") {
            dispatch(addBedEvent(selectedBed.trackedEntityInstance, metaData.beds.id, programStage, activeICU.id, "Admitted", bedEventDataValues));
        } else if (actionType === "reserve") {
            dispatch(addBedEvent(selectedBed.trackedEntityInstance, metaData.beds.id, programStage, activeICU.id, "Reserved", bedEventDataValues));
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
    }

    return (
        <Modal open>
            <ModalTitle>
                {modelTitle}
            </ModalTitle>
            <ModalContent>
                <h4>Patient Information</h4>
                {patientAttsSet.map((attrib) => getPatientFormFields(attrib))}
                {bedDataValuesSet.map((attrib) => getDataValueFormField(attrib))}

                <h4>Facility Utilization</h4>
                {PATIENT_FACILITY_UTLIZATION.map((attrib) => getDataValueFormField(attrib))}

                <h4>Specialists Utilization</h4>
                {PATIENT_SPECIALIZATION_UTLIZATION.map((attrib) => getDataValueFormField(attrib))}

                <h4>Clinical Parameters</h4>
                {PATIENT_CLINICAL_PARAMETERS.map((attrib) => getDataValueFormField(attrib))}
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