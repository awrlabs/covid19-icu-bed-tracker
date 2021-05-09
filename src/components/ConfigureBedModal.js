import React, { useState, useEffect } from 'react';
import {
    Modal, ModalTitle, ModalActions, ModalContent, ButtonStrip, Button,
    InputField, SingleSelect, RadioGroup, Radio, RadioGroupField, SingleSelectOption, SingleSelectField

} from '@dhis2/ui-core';
import { useSelector, useDispatch } from 'react-redux';
import * as moment from 'moment';
import { useDataMutation, useDataEngine } from '@dhis2/app-runtime';
import { createBed, updateBed } from '../state/apiActions';

const booleanSelections = [
    { label: "No", value: 'false' },
    { label: "Yes", value: 'true' },
];

const experiseAttrbutes = [
    "v5eNzdQsLox",
    "eBlbs7BzVfX",
    "JJ2DQSnlhfR",
    "m64bCKnUD8L",
    "Xar8cTc8XN0",
    "k7eXIuzzhat",
    "JZXI1GzSoYx",
]

const facilitiesAttributes = [
    "Jio5MTDVFo4",
    "yvOZEiBS5cd",
    "CGp0lKLkSKY",
    "YCILPvLTofG"
]

const infoAttributes = [
    "tswabivShTy",
    "Xt5tV6OFSEW",
    "XYNBoDZS0aV"
]

function findAttribute(attributes, id) {
    const search = attributes.filter(a => a.attribute === id);
    return search.length > 0 ? search[0].value : null;
}

function findOption(optionSet, code) {
    const search = optionSet.filter(o => o.code === code);
    return search[0];
}

export default function ConfigureBedModal({ open, onClose, selectedBed, editable }) {
    const metaData = useSelector(state => state.app.metaData);
    const activeICU = useSelector(state => state.app.activeICU);

    const [bedAttributes, setBedAttributtes] = useState([]);
    const [formState, setFormState] = useState({});

    const engine = useDataEngine();
    const dispatch = useDispatch();

    useEffect(() => {
        if (metaData) {
            let _bedAttributes = metaData.beds.trackedEntityType.trackedEntityTypeAttributes;
            let _formState = {};
            for (var attrib of _bedAttributes) {
                // check if this is a update thing
                let bedValue = null;
                if (selectedBed) {
                    bedValue = findAttribute(selectedBed.attributes, attrib.id);
                }

                if (attrib.valueType === "TEXT") {
                    if (attrib.optionSet && attrib.optionSet.options && attrib.optionSet.options.length > 0) {
                        if (bedValue) {
                            const option = findOption(attrib.optionSet.options, bedValue);
                            _formState[attrib.id] = {
                                "label": option.displayName,
                                "value": option.code
                            }
                        } else {
                            _formState[attrib.id] = {
                                "label": attrib.optionSet.options[0].displayName,
                                "value": attrib.optionSet.options[0].code
                            }
                        }
                    } else {
                        _formState[attrib.id] = bedValue ? bedValue : "";
                    }
                } else if (attrib.valueType === "BOOLEAN") {
                    _formState[attrib.id] = {
                        "label": bedValue && bedValue === "true" ? "Yes" : "No",
                        "value": bedValue ? bedValue : "false"
                    }
                }
            }

            setFormState(_formState);
            setBedAttributtes(_bedAttributes)
        }
    }, [metaData]);

    if (!open) {
        return <></>
    }

    const updateField = (field, value) => {
        setFormState({
            ...formState,
            [field]: value
        })
    }

    const getAttributeInput = (attribId, key) => {

        const attrib = bedAttributes.find(b => b.id === attribId);

        if (attrib.optionSet && attrib.optionSet.options && attrib.optionSet.options.length > 0) {
            return (
                <SingleSelectField
                    key={key}
                    label={attrib.formName}
                    name={attrib.id}
                    onChange={(val) => updateField(attrib.id, val.selected)}
                    selected={formState[attrib.id]}
                    disabled={!editable}
                >
                    {attrib.optionSet.options.map((sel, key) =>
                        <SingleSelectOption key={key} label={sel.displayName} value={sel.code} />
                    )}
                </SingleSelectField>
            )
        }

        if (attrib.valueType === "TEXT") {
            return (
                <InputField
                    key={key}
                    label={attrib.formName}
                    name={attrib.id}
                    type="text"
                    onChange={(val) => updateField(attrib.id, val.value)}
                    value={formState[attrib.id]}
                    disabled={!editable}
                />
            )
        }

        if (attrib.valueType === "BOOLEAN") {

            return (
                <SingleSelectField
                    key={key}
                    label={attrib.formName}
                    name={attrib.id}
                    onChange={(val) => updateField(attrib.id, val.selected)}
                    selected={formState[attrib.id]}
                    disabled={!editable}
                >
                    {booleanSelections.map((sel, key) =>
                        <SingleSelectOption key={key} label={sel.label} value={sel.value} />
                    )}
                </SingleSelectField>
            )
            return (<></>)
        }

    }

    const addBed = async () => {
        const attributes = [];

        for (var attrib in formState) {
            attributes.push({
                "attribute": attrib,
                "value": formState[attrib].value ? formState[attrib].value : formState[attrib]
            })
        }

        if (selectedBed) {
            // update existing bed
            dispatch(updateBed(activeICU.id, selectedBed.trackedEntityInstance, attributes))
        } else {
            //create new bed
            dispatch(createBed(metaData.beds.trackedEntityType.id, activeICU.id, metaData.beds.id, attributes));
        }
        onClose();
    }

    let modelTitle = (!editable ? "View" : selectedBed ? "Update" : "Add") + " ICU Bed";

    return (
        <Modal open>
            <ModalTitle>
                {modelTitle}
            </ModalTitle>
            <ModalContent>
                {bedAttributes.length > 0 &&
                    <div className="form">
                        {infoAttributes.map((attrib, key) =>
                            getAttributeInput(attrib, key)
                        )}

                        <h4>Facilities</h4>
                        {facilitiesAttributes.map((attrib, key) =>
                            getAttributeInput(attrib, key)
                        )}

                        <h4>Expertise</h4>
                        {experiseAttrbutes.map((attrib, key) =>
                            getAttributeInput(attrib, key)
                        )}
                    </div>
                }
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
                    {editable ?
                        <Button
                            onClick={addBed}
                            primary
                            type="button"
                        >
                            {selectedBed ? "Update Bed" : "Add New Bed"}
                        </Button>
                        : null}
                </ButtonStrip>
            </ModalActions>
        </Modal>
    )
}