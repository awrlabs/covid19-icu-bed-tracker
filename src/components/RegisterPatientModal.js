import React, { useState, useEffect, useMemo } from 'react';
import {
    Modal, ModalTitle, ModalActions, ModalContent, ButtonStrip, Button,
    InputField, SingleSelect, RadioGroup, Radio, RadioGroupField, SingleSelectOption, SingleSelectField,
    Checkbox
} from '@dhis2/ui-core';
import { addBedEvent, addBedPatientRelationship, createPatient } from '../state/apiActions';
import { useSelector, useDispatch } from 'react-redux';
import {
    DATA_ELEMENT_TEI_ID, PATIENT_ATTRIBUTES, PATIENT_FACILITY_UTLIZATION,
    PATIENT_SPECIALIZATION_UTLIZATION, PATIENT_TEI_TYPE, PROGRAM_PATIENTS, PATIENT_FACILITY_UTLIZATION_BED_ATT_MAP,
    PATIENT_CARMOBIDIES,
    INDICATION_FOR_ADMISSION,
    INDICATION_FOR_ADMISSION_VARS,
    PATIENT_CLINICAL_PARAMETERS,
    QSOFA,
    PATIENT_ATT_AGE,
    PATIENT_ATT_DOB,
    PATIENT_ATT_EXCLUDE,
    PATIENT_ATT_GENDER,
    DATA_ELEMENT_PATIENT_PREGNANCY
} from '../constants';
import { getLastEvent } from './DataStore';
import moment from 'moment';

export default function RegisterPatientModal({ open, onClose, selectedBed, actionType, editable }) {

    const [formState, setFormState] = useState({});
    const dispatch = useDispatch();

    const metaData = useSelector(state => state.app.metaData);
    const programStage = useSelector(state => state.app.ICUEventId);
    const activeICU = useSelector(state => state.app.activeICU);

    const [incidentDate, setIncidentDate] = useState(moment().format("YYYY-MM-DD"));

    const bedDataValuesSet = PATIENT_ATTRIBUTES;

    const patientAttsSet = useMemo(() => metaData.patients.trackedEntityType.trackedEntityTypeAttributes.filter(att => {
        return PATIENT_ATT_EXCLUDE.indexOf(att.id) === -1;
    }), [metaData]);

    const lastBedEvent = useMemo(() => selectedBed.lastEvent || getLastEvent(selectedBed.trackedEntityInstance), [selectedBed]);

    useEffect(() => {
        let _formState = {};
        if (lastBedEvent) {
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
        }

        // setting constant fields
        Object.keys(PATIENT_FACILITY_UTLIZATION_BED_ATT_MAP).forEach(k => {
            _formState[k] = selectedBed[PATIENT_FACILITY_UTLIZATION_BED_ATT_MAP[k]];
        });

        if (!_formState[PATIENT_ATT_AGE]) {
            _formState[PATIENT_ATT_AGE] = "0";
        }

        setFormState(_formState);
    }, [selectedBed, metaData, lastBedEvent]);


    useEffect(() => {
        if (formState[PATIENT_ATT_DOB]) {
            let age = (moment().diff(formState[PATIENT_ATT_DOB], 'years')) + "";
            if (age !== formState[PATIENT_ATT_AGE]) {
                updateField(PATIENT_ATT_AGE, age);
            }
        }
    }, [formState]);

    const updateField = (field, value) => {
        setFormState({
            ...formState,
            [field]: value
        });
    }

    const getFormField = (field) => {
        let fieldDisabled = !editable || PATIENT_FACILITY_UTLIZATION_BED_ATT_MAP[field.id] !== undefined
            || PATIENT_ATT_AGE === field.id;

        if (formState[PATIENT_ATT_GENDER] && formState[PATIENT_ATT_GENDER].value === "Male" && field.id === DATA_ELEMENT_PATIENT_PREGNANCY) {
            console.log("Retuning null", field);
            return null;
        }

        if (field.type === "TEXT" || field.type === "INTEGER_ZERO_OR_POSITIVE" || field.type === "NUMBER" || field.type === "PHONE_NUMBER" || field.type === "DATE") {
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

            let type = "text";

            switch (field.type) {
                case "PHONE_NUMBER":
                    type = "number";
                    break;
                case "INTEGER_ZERO_OR_POSITIVE":
                    type = "number";
                    break;
                case "DATE":
                    type = "date";
                    break;
            }

            return (
                <InputField
                    key={field.id}
                    label={field.formName}
                    name={field.id}
                    onChange={(val) => updateField(field.id, val.value)}
                    value={formState[field.id]}
                    type={type}
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
        } else {
            console.log("FLD", field.type);
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
                || PATIENT_CLINICAL_PARAMETERS.indexOf(field) >= 0
                || PATIENT_CARMOBIDIES.indexOf(field) >= 0
                || INDICATION_FOR_ADMISSION.indexOf(field) >= 0
                || INDICATION_FOR_ADMISSION_VARS.indexOf(field) >= 0
                || QSOFA.indexOf(field) >= 0) {
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

        console.log("Saving", patientAttributes, admitEventDataValues);

        dispatch(createPatient(PATIENT_TEI_TYPE, activeICU.id, PROGRAM_PATIENTS, patientAttributes, admitEventDataValues, incidentDate, (patientId) => {
            // save the bed admit event
            bedEventDataValues.push({
                dataElement: DATA_ELEMENT_TEI_ID,
                value: patientId
            });

            if (actionType === "admit") {
                dispatch(addBedEvent(selectedBed.trackedEntityInstance, metaData.beds.id, programStage, activeICU.id, "Admitted", bedEventDataValues, incidentDate));
            } else if (actionType === "reserve") {
                dispatch(addBedEvent(selectedBed.trackedEntityInstance, metaData.beds.id, programStage, activeICU.id, "Reserved", bedEventDataValues, incidentDate));
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
                <InputField
                    label="Admission Date"
                    name="incident_date"
                    onChange={(val) => setIncidentDate(val.value)}
                    value={incidentDate}
                    type="date" />
                <h4>Patient Information</h4>
                {patientAttsSet.map((attrib) => getPatientFormFields(attrib))}
                {bedDataValuesSet.map((attrib) => getDataValueFormField(attrib))}
                {PATIENT_CLINICAL_PARAMETERS.map((attrib) => getDataValueFormField(attrib))}
                {/* <h4>Facility Utilization</h4>
                {PATIENT_FACILITY_UTLIZATION.map((attrib) => getDataValueFormField(attrib))} 
        
                

                <h4>Specialists Utilization</h4>
                {PATIENT_SPECIALIZATION_UTLIZATION.map((attrib) => getDataValueFormField(attrib))} */}

                <h4>Comorbidities</h4>
                {PATIENT_CARMOBIDIES.map((attrib) => getDataValueFormField(attrib))}


                <h4>Indication For Admission</h4>
                {INDICATION_FOR_ADMISSION.map((attrib) => getDataValueFormField(attrib))}

                {
                    actionType !== "reserve" && (
                        <>
                            {INDICATION_FOR_ADMISSION_VARS.map((attrib) => getDataValueFormField(attrib))}
                            <h4>qSOFA</h4>
                            {QSOFA.map((attrib) => getDataValueFormField(attrib))}
                        </>
                    )
                }
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