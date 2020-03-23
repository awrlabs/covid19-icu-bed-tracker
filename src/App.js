import React, { useState, useEffect } from 'react'
import { Provider, useSelector, useDispatch } from 'react-redux';
import { DataQuery, useDataQuery, useDataEngine } from '@dhis2/app-runtime'
import i18n from '@dhis2/d2-i18n'
import OrgUnits from './components/OrgUnits'
import './App.css';
import { Card, MultiSelect, MultiSelectOption, MultiSelectField, Button, ButtonStrip, 
         Table, TableHead, TableBody, TableRow, TableCellHead, TableCell,
} from '@dhis2/ui-core';
import ICUTable from './components/ICUTable';
import * as api from "./mockapi";
import { rootReducer } from './state/store';
import ICUBed from './components/ICUBed';
import ConfigureBedModal from './components/ConfigureBedModal';
import { setActiveICU, setMetaData } from './state/appState';
import { configureStore, getDefaultMiddleware } from '@reduxjs/toolkit';
import { getICUBeds } from './state/apiActions';
import ICUMap from './components/ICUMap'

function ViewOrgICU(){
    const activeOrgUnit = useSelector(state => state.app.activeOrgUnit);
    const [bedData, setBedData] = useState([]);
    
    useEffect(() => {
        setBedData(api.getICUByOrgUnit("lka"))
    }, []);

    const onBedTypeChange = () => {

    }

    if(!activeOrgUnit){
        return <p>Please select an organization unit</p>
    }

    if(activeOrgUnit.level === 4){
        return <ViewICUBeds />
    }

    return (
        activeOrgUnit.level < 4 && (
            <>
                <span className="t20">Showing ICU Bed data for <b>{activeOrgUnit.name}</b></span>
                <div className="filter-area">
                    
                        <MultiSelect placeholder="ICU Type" onChange={onBedTypeChange}>
                            <MultiSelectOption value="type01" label="Medical" />
                            <MultiSelectOption value="type01" label="Surgical" />
                            <MultiSelectOption value="type01" label="Neurosurgical" />
                            <MultiSelectOption value="type01" label="Pediatric" />
                            <MultiSelectOption value="type01" label="Neonatal" />
                            <MultiSelectOption value="type01" label="Other" />
                        </MultiSelect>
                        <MultiSelect placeholder="Bed Type" onChange={onBedTypeChange}>
                            <MultiSelectOption value="type01" label="Type 01"  onClick={onBedTypeChange} />
                        </MultiSelect>
                        <MultiSelect placeholder="Diagnosis Type" onChange={onBedTypeChange}>
                            <MultiSelectOption value="type01" label="Type 01"  onClick={onBedTypeChange} />
                        </MultiSelect>
                    
                </div>
                <div className="icu-org">
                    <div className="icu-table">
                        <ICUTable 
                            data={bedData}
                        />
                    </div>
                    <div className="icu-map">
                        <ICUMap
                            onMarkerClick={(ICUEntry)=>{console.log(ICUEntry)}}
                        />
                    </div>
                </div>
            </>
        )
    )

}

function ViewICUBeds(){
    const activeOrgUnit = useSelector(state => state.app.activeOrgUnit);
    const [beds, setBeds] = useState([]);

    useEffect(() => {
        setBeds(api.getICUBeds(50));
    }, []);

    if(!activeOrgUnit){
        return <p>Please select an organization unit</p>
    }

    return (
        <>
            <div className="inner-header">
                <span className="t20">Showing ICU Bed status at <b>{activeOrgUnit.name}</b></span>
                <Button className="pull-right">Configure Beds</Button>
            </div>
            <div className="icu-bed-container">
                {beds.map((bed, key) => (
                    <ICUBed 
                        key={key}
                        name={bed.name}
                        status={bed.status}
                    />
                ))}
            </div>
        </>
    )
}

function ViewConfigureBeds(){
    const [bedModalOpen, setBedModalOpen] = useState(false);
    const dispatch = useDispatch();

    const activeICU = useSelector(state => state.app.activeICU);
    const [selectedBed, setSelectedBed] = useState(null);

    useEffect(() => {
        dispatch(getICUBeds(activeICU.id));
    }, []);

    const getAttributeByName = (bed, name) => {
        for(var attrib of bed.attributes){
            if(attrib.displayName === name){
                return attrib.value; 
            }
        }
        return "";
    }

    const onAddBed = () => {
        setSelectedBed(null);
        setBedModalOpen(true);
    }

    const onSelectBed = (bed) => {
        setSelectedBed(bed);
        setBedModalOpen(true);
    }

    return (
        <>
            <div className="inner-header">
                <ButtonStrip end>
                    <Button>Back</Button>
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
                            {activeICU.beds.map((bed, key) => (
                                <TableRow key={key}>
                                    <TableCell>{getAttributeByName(bed, "ICU - Bed Number")}</TableCell>
                                    <TableCell>{getAttributeByName(bed, "ICU - Type")}</TableCell>
                                    <TableCell>{getAttributeByName(bed, "ICU - COVID Type")}</TableCell>
                                    <TableCell>
                                        <ButtonStrip>
                                            <Button onClick={() => onSelectBed(bed)}>View Details</Button>
                                            <Button destructive>Remove</Button>
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
                />
            }
        </>
    )
}

function ContainerView({children}){
    const query = {
        metaData: {
            resource: 'programs/C1wTfmmMQUn',
            params: {
                fields: "id,name,trackedEntityType[id, displayName, trackedEntityTypeAttributes[trackedEntityAttribute[id, displayName, valueType, optionSet[options[displayName, id, code]]]]]"
            },
        }
    }
    const { loading, error, data, refetch } = useDataQuery(query);
    const dispatch = useDispatch();

    useEffect(() => {
        if(data){
            let _metaData = {
                id: data.metaData.id,
                name: data.metaData.name,
                trackedEntityType: {
                    id: data.metaData.trackedEntityType.id,
                    displayName: data.metaData.trackedEntityType.displayName,
                    trackedEntityTypeAttributes: []
                }
            };

            for(var attrib of data.metaData.trackedEntityType.trackedEntityTypeAttributes){
                _metaData.trackedEntityType.trackedEntityTypeAttributes.push(attrib.trackedEntityAttribute);
            }

            dispatch(setMetaData(_metaData));
        }
    }, [loading]);

    return (
        <div style={{height:"100vh"}}>
            {children}
        </div>
    )
}

function MyApp(){
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
    
    return (
        <Provider store={store}>
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
            </ContainerView>
        </Provider>
    )
}

export default MyApp
