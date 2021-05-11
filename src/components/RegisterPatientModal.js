import React, { useState, useEffect } from 'react';
import {
    Modal, ModalTitle, ModalActions, ModalContent, ButtonStrip, Button,
    InputField, SingleSelect, RadioGroup, Radio, RadioGroupField, SingleSelectOption, SingleSelectField,
    Checkbox
} from '@dhis2/ui-core';
import { addBedEvent, addBedPatientRelationship, createPatient } from '../state/apiActions';
import { useSelector, useDispatch } from 'react-redux';
import {
    DATA_ELEMENT_TEI_ID, PATIENT_ATTRIBUTES, PATIENT_CLINICAL_PARAMETERS, PATIENT_FACILITY_UTLIZATION,
    PATIENT_SPECIALIZATION_UTLIZATION, PATIENT_TEI_TYPE, PROGRAM_PATIENTS, PATIENT_FACILITY_UTLIZATION_BED_ATT_MAP
} from '../constants';
import { getLastEvent } from './DataStore';

export default function RegisterPatientModal({ open, onClose, selectedBed, actionType, editable }) {

    const [formState, setFormState] = useState({});
    const dispatch = useDispatch();

    const metaData = useSelector(state => state.app.metaData);
    const programStage = useSelector(state => state.app.ICUEventId);
    const activeICU = useSelector(state => state.app.activeICU);

    const bedDataValuesSet = PATIENT_ATTRIBUTES;

    const patientAttsSet = metaData.patients.trackedEntityType.trackedEntityTypeAttributes;

    const lastBedEvent = selectedBed.lastEvent || getLastEvent(selectedBed.trackedEntityInstance);

    useEffect(() => {
        let _formState = {};
        for (var fieldId of bedDataValuesSet) {
            const field = Object.values(metaData.dataElements).find(de => de.id === fieldId);
            let lastValue = lastBedEvent.dataValues.find(dv => dv.dataElement === field.id);
            if (field.type === "TEXT") {
                if (!editable && lastBedEvent) {
                    _formState[field.id] = lastValue != undefined ? lastValue.value : "";
                } else {
                    _formState[field.id] = "";
                }
            } else if (field.type === "BOOLEAN") {
                if (!editable && lastBedEvent) {
                    // below condition looks stupid, but required
                    _formState[field.id] = lastValue != undefined ? (lastValue.value === 'true' || lastValue.value === true) : false;
                } else {
                    _formState[field.id] = false;
                }
            }
        }

        // setting constant fields
        Object.keys(PATIENT_FACILITY_UTLIZATION_BED_ATT_MAP).forEach(k => {
            _formState[k] = selectedBed[PATIENT_FACILITY_UTLIZATION_BED_ATT_MAP[k]];
        });

        setFormState(_formState);
    }, [selectedBed, metaData]);

    const updateField = (field, value) => {
        setFormState({
            ...formState,
            [field]: value
        })
    }

    const getFormField = (field) => {
        let fieldDisabled = !editable || PATIENT_FACILITY_UTLIZATION_BED_ATT_MAP[field.id] !== undefined;
        if (field.type === "TEXT" || field.type === "INTEGER_ZERO_OR_POSITIVE" || field.type === "NUMBER" || field.type === "PHONE_NUMBER") {
            if (field.options) {
                let selected = formState[field.id];
                if (selected && !selected.value) {
                    selected = {
                        label: selected,
                        value: selected
                    }
                }
                return (
                    <SingleSelectField
                        key={field.id}
                        label={field.formName}
                        name={field.id}
                        onChange={(val) => updateField(field.id, val.selected)}
                        selected={selected}
                        disabled={fieldDisabled}>
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
                    type={(field.type === "TEXT" || field.type === "PHONE_NUMBER") ? "text" : "number"}
                    disabled={fieldDisabled} />
            )
        } else if (field.type == "BOOLEAN") {
            return (
                <Checkbox
                    key={field.id}
                    label={field.formName}
                    name={field.id}
                    onChange={(val) => updateField(field.id, val.checked)}
                    checked={formState[field.id]}
                    disabled={fieldDisabled} />
            )
        }
    }

    const getDataValueFormField = (attrib) => {
        const field = Object.values(metaData.dataElements).find(de => de.id === attrib);
        return field && getFormField(field);
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

        let admitEventDataValues = [];

        let patientAttributes = [];

        for (var field in formState) {
            let value = formState[field].value ? formState[field].value : formState[field];
            if (PATIENT_ATTRIBUTES.indexOf(field) >= 0) {
                bedEventDataValues.push({
                    dataElement: field,
                    value
                });
            } else if (PATIENT_FACILITY_UTLIZATION.indexOf(field) >= 0
                || PATIENT_SPECIALIZATION_UTLIZATION.indexOf(field) >= 0
                || PATIENT_CLINICAL_PARAMETERS.indexOf(field) >= 0) {
                admitEventDataValues.push({
                    dataElement: field,
                    value
                });
            } else if (patientAttsSet.find(att => att.id === field)) {
                patientAttributes.push({
                    attribute: field,
                    value
                });
            }
        }

        // first save the patient and admit event

        console.log("Savig", patientAttributes, admitEventDataValues);

        dispatch(createPatient(PATIENT_TEI_TYPE, activeICU.id, PROGRAM_PATIENTS, patientAttributes, admitEventDataValues, (patientId) => {
            // save the bed admit event
            bedEventDataValues.push({
                dataElement: DATA_ELEMENT_TEI_ID,
                value: patientId
            });

            if (actionType === "admit") {
                dispatch(addBedEvent(selectedBed.trackedEntityInstance, metaData.beds.id, programStage, activeICU.id, "Admitted", bedEventDataValues));
            } else if (actionType === "reserve") {
                dispatch(addBedEvent(selectedBed.trackedEntityInstance, metaData.beds.id, programStage, activeICU.id, "Reserved", bedEventDataValues));
            }

            // adding relationship
            dispatch(addBedPatientRelationship(selectedBed.trackedEntityInstance, patientId));
            onClose();
        }, onClose));
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