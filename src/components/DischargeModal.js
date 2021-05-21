import React, { useState, useEffect, useMemo } from 'react';
import {
    Modal, ModalTitle, ModalActions, ModalContent, ButtonStrip, Button,
    InputField, SingleSelect, RadioGroup, Radio, RadioGroupField, SingleSelectOption, SingleSelectField,
    Checkbox
} from '@dhis2/ui-core';
import { useSelector, useDispatch } from 'react-redux';
import { DATA_ELEMENT_DISCHARGE_OUTCOME, DATA_ELEMENT_TEI_ID } from '../constants';
import { getLastEvent } from './DataStore';
import { addBedEvent, completePatientEnrollment } from '../state/apiActions';
import moment from 'moment';

export default function DischargeModal({ onClose, selectedBed }) {
    const metaData = useSelector(state => state.app.metaData);
    const [selected, setSelected] = useState();
    const programStage = useSelector(state => state.app.ICUEventId);
    const activeICU = useSelector(state => state.app.activeICU);

    const [incidentDate, setIncidentDate] = useState(moment().format("YYYY-MM-DD"));

    const dispatch = useDispatch();

    const dischargeDataElement = useMemo(() => Object.values(metaData.dataElements).find(de => de.id === DATA_ELEMENT_DISCHARGE_OUTCOME), [metaData]);

    const updateField = (value) => {
        setSelected(value.selected);
    };

    const onDischarge = () => {
        let lastEvent = getLastEvent(selectedBed.trackedEntityInstance);
        let teiId = lastEvent.dataValues.find(dv => dv.dataElement === DATA_ELEMENT_TEI_ID);
        if (teiId) {
            // complete patient enrollment
            dispatch(completePatientEnrollment(teiId.value, activeICU.id, selected.value, incidentDate));
        }
        dispatch(addBedEvent(selectedBed.trackedEntityInstance, metaData.beds.id, programStage, activeICU.id, "Discharged", [], incidentDate));
        onClose();
    };

    return (
        <Modal open>
            <ModalTitle>
                Discharge Patient
            </ModalTitle>
            <ModalContent>
                <InputField
                    label="Incident Date"
                    name="incident_date"
                    onChange={(val) => setIncidentDate(val.value)}
                    value={incidentDate}
                    type="date" />
                <SingleSelectField
                    key={dischargeDataElement.id}
                    label={dischargeDataElement.formName}
                    name={dischargeDataElement.id}
                    onChange={updateField}
                    selected={selected}>
                    {dischargeDataElement.options.map((sel, key) =>
                        <SingleSelectOption key={key} label={sel.displayName} value={sel.code} />
                    )}
                </SingleSelectField>
            </ModalContent>
            <ModalActions>
                <ButtonStrip>
                    <Button onClick={onDischarge} primary disabled={selected === undefined}>
                        Discharge
                    </Button>
                    <Button onClick={onClose} destructive>
                        Cancel
                    </Button>
                </ButtonStrip>
            </ModalActions>
        </Modal>
    );
}