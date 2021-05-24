import React, { useState, useEffect } from 'react'
import { Provider, useSelector, useDispatch } from 'react-redux';
import { DataQuery, useDataQuery, useDataEngine, useConfig } from '@dhis2/app-runtime'
import i18n from '@dhis2/d2-i18n'
import OrgUnits from './components/OrgUnits'
import './App.css';
import {
    Card, MultiSelect, MultiSelectOption, MultiSelectField, Button, ButtonStrip,
    Table, TableHead, TableBody, TableRow, TableCellHead, TableCell, CircularLoader
} from '@dhis2/ui-core';
import ICUTable from './components/ICUTable';
import { rootReducer } from './state/store';
import ICUBed from './components/ICUBed';
import ConfigureBedModal from './components/ConfigureBedModal';
import { setActiveICU, setActiveOrgUnit, updateFilteredICUList, setFilterCriteria } from './state/appState';
import { configureStore, getDefaultMiddleware } from '@reduxjs/toolkit';
import { getICUBeds, getMetaData, addBedEvent, removeBed, getActiveUser, getActiveICData, completePatientEnrollment } from './state/apiActions';
import RegisterPatientModal from './components/RegisterPatientModal';
import useConfirmation from './components/useConfirmationHook';
import ICUMap from './components/ICUMap'
import Notification from './components/Notification'
import { hasPerm, ACTIONS } from './components/permissionUtils';
import { EXPERTISE_ATTRIBUTES, FACILITIES_ATTRIBUTES, PROGRAM, ATT_BED_TYPE, ATT_COVID_TYPE, ATT_BED_NUMBER, DATA_ELEMENT_TEI_ID, PROGRAM_PATIENTS } from './constants';
import DataStore, { getICUsForParent, getLastEvent, removeBed as removeCachedBed } from "./components/DataStore";
import { showNotification } from './state/notificationState';
import DischargeModal from './components/DischargeModal';

function ViewOrgICU() {

    const activeOrgUnit = useSelector(state => state.app.activeOrgUnit);
    const activeUser = useSelector(state => state.app.activeUser);
    const bedData = useSelector(state => state.app.icuList);
    const metaData = useSelector(state => state.app.metaData);
    const [isLoading, setIsLoading] = useState(true);

    const dispatch = useDispatch();

    const covidTypeId = ATT_COVID_TYPE;
    let bedTypeData = null;
    let covidTypeData = null;
    let expertiseFilterData = null;
    let fascilitiesFilterData = null;
    if (metaData) {
        let attMap = new Map(metaData.beds.trackedEntityType.trackedEntityTypeAttributes.map(att => [att.id, att]));
        bedTypeData = attMap.get(ATT_BED_TYPE);
        covidTypeData = attMap.get(ATT_COVID_TYPE);
        expertiseFilterData = EXPERTISE_ATTRIBUTES.map(ex => attMap.get(ex));
        fascilitiesFilterData = FACILITIES_ATTRIBUTES.map(ex => attMap.get(ex));
    }
    const [filters, setFilters] = useState({ [ATT_BED_TYPE]: [], [ATT_COVID_TYPE]: [] })
    const [expertisetFilters, setExpertisetFilters] = useState([])
    const [fascilitiesFilters, setFascilitiesFilters] = useState([])

    useEffect(() => {
        if (bedData) {
            setIsLoading(false);
        }
    }, [bedData]);

    useEffect(() => {
        if (activeOrgUnit) {
            setIsLoading(true);
            dispatch(setFilterCriteria(
                {
                    typeFilters: filters,
                    specialityFilters: expertisetFilters.concat(fascilitiesFilters)
                }
            ));
            setTimeout(() => {
                getICUsForParent(activeOrgUnit.id, filters, expertisetFilters.concat(fascilitiesFilters), activeUser.originId).then(icus => {
                    dispatch(updateFilteredICUList(icus));
                });
            }, 0);

        }
    }, [filters, expertisetFilters, fascilitiesFilters]);

    if (!activeOrgUnit) {
        return <p>Please select an organization unit</p>
    }

    if (activeOrgUnit.level === 5) {
        return <ViewICUBeds />
    }

    const onSelectICU = (icu) => {
        dispatch(setActiveOrgUnit({
            id: icu.id,
            name: icu.name,
            level: 5
        }));

        dispatch(setActiveICU({
            id: icu.id,
            beds: []
        }))
    }

    return (
        activeOrgUnit.level < 6 && (
            <>
                <span className="t20">Showing ICU Locations for <b>{activeOrgUnit.name}</b></span>
                <div className="filter-area">
                    <MultiSelect
                        selected={filters[ATT_BED_TYPE]}
                        placeholder={bedTypeData.displayName}
                        onChange={({ selected }) => { setFilters({ ...filters, [ATT_BED_TYPE]: selected }) }}>
                        {bedTypeData && bedTypeData.optionSet.options.map((option, key) => (
                            <MultiSelectOption className="multiselect-bedtype" key={key} value={option.code} label={option.displayName} />
                        ))}
                    </MultiSelect>
                    <MultiSelect
                        selected={filters[ATT_COVID_TYPE]}
                        placeholder={covidTypeData.displayName}
                        onChange={({ selected }) => { setFilters({ ...filters, [ATT_COVID_TYPE]: selected }) }}>
                        {covidTypeData && covidTypeData.optionSet.options.map((option, key) => (
                            <MultiSelectOption key={key} value={option.code} label={option.displayName} />
                        ))}
                    </MultiSelect>
                    <MultiSelect
                        selected={expertisetFilters}
                        placeholder="Expertise"
                        onChange={({ selected }) => {
                            setExpertisetFilters(selected);
                        }}>
                        {expertiseFilterData && expertiseFilterData.map((option, key) => (
                            <MultiSelectOption key={option.id} value={option.id} label={option.displayName} />
                        ))}
                    </MultiSelect>
                    <MultiSelect
                        selected={fascilitiesFilters}
                        placeholder="Facilities"
                        onChange={({ selected }) => {
                            setFascilitiesFilters(selected);
                        }}>
                        {fascilitiesFilterData && fascilitiesFilterData.map((option, key) => (
                            <MultiSelectOption key={option.id} value={option.id} label={option.displayName} />
                        ))}
                    </MultiSelect>
                    {(isLoading) &&
                        <div className="icu-table-loading">
                            <CircularLoader small={true} />
                        </div>
                    }
                </div>


                <div className="icu-org">
                    <div className="icu-table">
                        <ICUTable
                            data={bedData}
                            onSelectICU={onSelectICU} />
                    </div>
                    <div className="icu-map">
                        <ICUMap
                            onMarkerClick={(ICUEntry) => { console.log(ICUEntry) }}
                            // data={bedData.filter(bed => bed.total !== 0)}
                            data={bedData}
                            origin={activeUser.origin} />
                    </div>
                </div>

            </>
        )
    )
}

function ViewICUBeds() {
    const activeUser = useSelector(state => state.app.activeUser);
    const activeOrgUnit = useSelector(state => state.app.activeOrgUnit);
    const activeICU = useSelector(state => state.app.activeICU);
    const metaData = useSelector(state => state.app.metaData);
    const programStage = useSelector(state => state.app.ICUEventId);

    const [showConfigure, setShowConfigure] = useState(false);
    const [bedModalOpen, setBedModalOpen] = useState(false);
    const [dischargeModalOpen, setDischargeModalOpen] = useState(false);
    const [patientModalOpen, setPatientModalOpen] = useState(false);
    const [patientModalAction, setPatientModalAction] = useState("admit");
    const [selectedBed, setSelectedBed] = useState(null);
    const [eventPerm, setEventPerm] = useState(false);
    const [patientEditable, setPatientEditable] = useState(true);

    const { baseUrl } = useConfig();

    const dispatch = useDispatch();
    const confirmation = useConfirmation();

    useEffect(() => {
        if (metaData) {
            dispatch(getICUBeds(activeICU.id, metaData.beds.id));
            dispatch(getActiveICData(activeICU.id));
            if (hasPerm(ACTIONS.ADD_EVENT, activeUser, metaData.beds.programAccess, metaData.beds.trackedEntityType.access, activeICU.id)) {
                setEventPerm(true);
            }
        }
    }, [metaData, activeICU.id]);

    const onViewBed = (bed) => {
        setSelectedBed(bed);
        setBedModalOpen(true);
    }

    const onOccupyBed = (bed) => {
        setSelectedBed(bed);
        setPatientEditable(true);
        setPatientModalAction("admit");
        setPatientModalOpen(true);
        // dispatch(addBedEvent(bed.trackedEntityInstance, metaData.id, programStage, activeICU.id, "Admitted"));
    }

    const onStatusChange = (bed) => {
        setPatientEditable(false);
        setSelectedBed(bed);
        setPatientModalAction("status");
        setPatientModalOpen(true);
    };

    const onReserveBed = (bed) => {
        // confirmation.show("Do you want to confirm reserving this bed?",
        //     () => dispatch(addBedEvent(bed.trackedEntityInstance, metaData.id, programStage, activeICU.id, "Reserved")),
        //     () => { }
        // );
        setSelectedBed(bed);
        setPatientEditable(true);
        setPatientModalAction("reserve");
        setPatientModalOpen(true);
    }

    const onDischargeBed = (bed) => {
        console.log("Dischanrging", bed);
        setSelectedBed(bed);
        setDischargeModalOpen(true);
        // confirmation.show("Do you want to confirm discharging this bed?",
        //     () => {
        //         let lastEvent = getLastEvent(bed.trackedEntityInstance);
        //         let teiId = lastEvent.dataValues.find(dv => dv.dataElement === DATA_ELEMENT_TEI_ID);
        //         if (teiId) {
        //             // complete patient enrollment
        //             dispatch(completePatientEnrollment(teiId.value));
        //         }
        //         dispatch(addBedEvent(bed.trackedEntityInstance, metaData.beds.id, programStage, activeICU.id, "Discharged"))
        //     },
        //     () => { }
        // );
    }

    const onViewPatient = (bed) => {
        let lastEvent = getLastEvent(bed.trackedEntityInstance);
        let teiId = lastEvent.dataValues.find(dv => dv.dataElement === DATA_ELEMENT_TEI_ID);
        if (teiId) {
            window.open(`${baseUrl}/dhis-web-tracker-capture/index.html#/dashboard?tei=${teiId.value}&program=${PROGRAM_PATIENTS}&ou=${bed.orgUnit}`, '_blank');
        } else {
            dispatch(showNotification({
                message: "Couldn't determine a valid patient assignment for this bed",
                type: 'error'
            }));
        }
        console.log("View Patient", bed, lastEvent, teiId, baseUrl);
        // setSelectedBed(bed);
        // setPatientEditable(false);
        // setPatientModalAction("view");
        // setPatientModalOpen(true);
    }

    if (!activeOrgUnit) {
        return <p>Please select an organization unit</p>
    }

    const getAttributeText = (beds, attribId, key) => {
        for (let bed of beds) {
            let bedAtt = bed.attributes.find(a => a.attribute === attribId);
            if (bedAtt && (bedAtt.value === "true" || bedAtt.value === "Yes")) {
                return (
                    <p key={key}>{metaData.beds.trackedEntityType.trackedEntityTypeAttributes.find(a => a.id === attribId).formName}</p>
                )
            }
        }
        return "";
    }

    return (
        <>
            <div className="inner-header">
                <span className="t20">Showing ICU Bed status at <b>{activeOrgUnit.name}</b></span>
                {hasPerm(ACTIONS.CONFIG_ICU, activeUser, metaData.beds.programAccess, metaData.beds.trackedEntityType.access, activeICU.id) &&
                    <Button onClick={() => setShowConfigure(true)} className="pull-right">Configure Beds</Button>
                }
            </div>
            <div className="info">
                {activeICU.beds.length > 0 &&
                    <div className="contact">
                        <p><b>Facilities</b></p>
                        {FACILITIES_ATTRIBUTES.map((attrib, key) => getAttributeText(activeICU.beds, attrib, key))}
                    </div>
                }
                {activeICU.beds.length > 0 &&
                    <div className="contact">
                        <p><b>Expertise</b></p>
                        {EXPERTISE_ATTRIBUTES.map((attrib, key) => getAttributeText(activeICU.beds, attrib, key))}
                    </div>
                }
                <div className="contact">
                    <p><b>Primary Contact</b></p>
                    <p>{activeICU.contactPerson ? activeICU.contactPerson : "No contact person listed"}</p>
                    <p>{activeICU.contactNumber ? activeICU.contactNumber : "No contact number listed"}</p>
                </div>
            </div>
            {activeICU &&
                <>
                    {showConfigure &&
                        <ViewConfigureBeds
                            onBack={() => setShowConfigure(false)}
                        />
                    }
                    {!showConfigure &&
                        <div className="icu-bed-container">
                            {!activeICU.beds.length &&
                                <p>No beds currently added</p>
                            }
                            {activeICU.beds.slice().sort((a, b) => {
                                return parseInt(a[[ATT_BED_NUMBER]]) - parseInt(b[[ATT_BED_NUMBER]]);
                            }).map((bed, key) => (

                                <ICUBed
                                    key={key}
                                    name={bed[ATT_BED_NUMBER]}
                                    status={bed.status ? bed.status : "IDLE"}
                                    onView={() => onViewBed(bed)}
                                    onOccupy={() => onOccupyBed(bed)}
                                    onDischarge={() => onDischargeBed(bed)}
                                    onReserve={() => onReserveBed(bed)}
                                    onViewPatient={() => onViewPatient(bed)}
                                    onStatusChange={() => onStatusChange(bed)}
                                    hasEventPerm={eventPerm}
                                    hasEditPerm={hasPerm(ACTIONS.CONFIG_ICU, activeUser, metaData.beds.programAccess, metaData.beds.trackedEntityType.access, activeICU.id)}
                                    bedId={bed.trackedEntityInstance}
                                />
                            ))}
                        </div>
                    }
                </>

            }
            {bedModalOpen &&
                <ConfigureBedModal
                    open={bedModalOpen}
                    onClose={() => setBedModalOpen(false)}
                    selectedBed={selectedBed}
                    editable={false}
                />
            }
            {patientModalOpen &&
                <RegisterPatientModal
                    open={patientModalOpen}
                    onClose={() => setPatientModalOpen(false)}
                    selectedBed={selectedBed}
                    actionType={patientModalAction}
                    editable={patientEditable}
                />
            }
            {
                dischargeModalOpen &&
                <DischargeModal
                    selectedBed={selectedBed}
                    onClose={() => {
                        setDischargeModalOpen();
                    }} />
            }
        </>
    )
}

function ViewConfigureBeds({ onBack }) {
    const [bedModalOpen, setBedModalOpen] = useState(false);
    const dispatch = useDispatch();

    const activeICU = useSelector(state => state.app.activeICU);
    const metaData = useSelector(state => state.app.metaData);
    const [selectedBed, setSelectedBed] = useState(null);

    const confirmation = useConfirmation();

    // useEffect(() => {
    //     dispatch(getICUBeds(activeICU.id, metaData.id));
    // }, []);

    const onAddBed = () => {
        setSelectedBed(null);
        setBedModalOpen(true);
    }

    const onSelectBed = (bed) => {
        setSelectedBed(bed);
        setBedModalOpen(true);
    }

    const onRemoveBed = (bed) => {
        confirmation.show("Do you really want to remove this bed?",
            () => {
                dispatch(removeBed(activeICU.id, bed.enrollments[0].enrollment, bed.trackedEntityInstance));
            },
            () => { }
        );

    }

    return (
        <>
            <div className="inner-header">
                <ButtonStrip end>
                    <Button onClick={onBack}>Back</Button>
                    <Button primary onClick={onAddBed}>Add New Bed</Button>
                </ButtonStrip>
            </div>
            <div className="inner-container">
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCellHead>Bed No</TableCellHead>
                            <TableCellHead>Bed Type</TableCellHead>
                            <TableCellHead>Covid Type</TableCellHead>
                            <TableCellHead>Action</TableCellHead>
                        </TableRow>
                    </TableHead>
                    {activeICU &&
                        <TableBody>
                            {activeICU.beds.slice().sort((a, b) => {
                                return parseInt(a[[ATT_BED_NUMBER]]) - parseInt(b[[ATT_BED_NUMBER]]);
                            }).map((bed, key) => (
                                <TableRow key={key}>
                                    <TableCell>{bed[ATT_BED_NUMBER]}</TableCell>
                                    <TableCell>{bed[ATT_BED_TYPE]}</TableCell>
                                    <TableCell>{bed[ATT_COVID_TYPE]}</TableCell>
                                    <TableCell>
                                        <ButtonStrip>
                                            <Button onClick={() => onSelectBed(bed)}>View Details</Button>
                                            <Button destructive onClick={() => onRemoveBed(bed)}>Remove</Button>
                                        </ButtonStrip>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    }
                </Table>
            </div>
            {bedModalOpen &&
                <ConfigureBedModal
                    open={bedModalOpen}
                    onClose={() => setBedModalOpen(false)}
                    selectedBed={selectedBed}
                    editable={true}
                />
            }
        </>
    )
}

function ContainerView({ children }) {
    const dispatch = useDispatch();

    useEffect(() => {
        dispatch(getMetaData());
        dispatch(getActiveUser());
    }, []);

    return (
        <div style={{ height: "100vh" }}>
            {children}
        </div>
    )
}

function MyApp() {
    const dhisEngine = useDataEngine();

    const customizedMiddleware = getDefaultMiddleware({
        thunk: {
            extraArgument: dhisEngine
        }
    })

    const store = configureStore({
        reducer: rootReducer,
        middleware: customizedMiddleware
    })

    // useEffect(()=>{
    //     console.log("USe Effect");
    //     DataStore.load();
    // });

    return (
        <Provider store={store}>
            <DataStore>
                <ContainerView>
                    <div className="container">
                        <div className="left-column">
                            <OrgUnits />
                        </div>
                        <div className="right-column">
                            <ViewOrgICU />
                            {/* <ViewICUBeds /> */}
                            {/* <ViewConfigureBeds /> */}
                        </div>
                    </div>
                    <div
                        style={{
                            bottom: 0,
                            left: 0,
                            paddingLeft: 16,
                            position: 'fixed',
                            width: '60%'
                        }}
                    >
                        <Notification />
                    </div>
                </ContainerView>
            </DataStore>
        </Provider>
    )
}

export default MyApp
