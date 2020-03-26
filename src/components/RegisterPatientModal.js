import React, { useState, useEffect } from 'react';
import { 
    Modal, ModalTitle, ModalActions, ModalContent, ButtonStrip, Button,
    InputField, SingleSelect, RadioGroup, Radio, RadioGroupField, SingleSelectOption, SingleSelectField
    
} from '@dhis2/ui-core';
import { addBedEvent } from '../state/apiActions';
import { useSelector, useDispatch } from 'react-redux';
import useConfirmation from './useConfirmationHook';

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

export default function RegisterPatientModal({ open, onClose, selectedBed, actionType}){

    const [formState, setFormState] = useState({});
    const dispatch = useDispatch();

    const metaData = useSelector(state => state.app.metaData);
    const programStage = useSelector(state => state.app.ICUEventId);
    const activeICU = useSelector(state => state.app.activeICU);
    
    const confirmation = useConfirmation();

    useEffect(() => {
        let _formState = {};
        for(var field of patientFieldset){
            if(field.type === "TEXT"){
                _formState[field.id] = "";
            }
        }
        setFormState(_formState);
    }, []);

    const updateField = (field, value) => {
        setFormState({
            ...formState,
            [field]: value
        })
    }

    const getFormField = (field, key) => {
        if(field.type === "TEXT"){
            return (
                <InputField 
                    key={key}
                    label={field.label}
                    name={field.id}
                    onChange={(val) => updateField(field.id, val.value)}
                    value={formState[field.id]}
                />
            )
        }
    }

    const admitPatient = () => {
        let dataValues = [];
        for(var field in formState){
            dataValues.push({
                dataElement: field,
                value: formState[field]
            })
        }

        if(actionType === "admit"){
            dispatch(addBedEvent(selectedBed.trackedEntityInstance, metaData.id, programStage, activeICU.id, "Admitted", dataValues));
        }else if(actionType === "reserve"){
            dispatch(addBedEvent(selectedBed.trackedEntityInstance, metaData.id, programStage, activeICU.id, "Reserved", dataValues));
        }
        onClose();
    }
    

    return (
        <Modal open>
            <ModalTitle>
                { actionType === "admit" ? 'Admit' : 'Reserve' } New Patient
            </ModalTitle>
            <ModalContent>
                {patientFieldset.map((field, key) => getFormField(field, key))}
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
                    <Button
                        onClick={admitPatient}
                        primary
                        type="button"
                    >
                        Admit Patient
                    </Button>
                </ButtonStrip>
            </ModalActions>
        </Modal>
    )
}