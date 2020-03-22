import React, { useState, useEffect } from 'react'
import { Provider, useSelector } from 'react-redux';
import { DataQuery } from '@dhis2/app-runtime'
import i18n from '@dhis2/d2-i18n'
import OrgUnits from './components/OrgUnits'
import './App.css';
import { Card, MultiSelect, MultiSelectOption, MultiSelectField } from '@dhis2/ui-core';
import ICUTable from './components/ICUTable';
import * as api from "./mockapi";
import { store } from './state/store';
import ICUBed from './components/ICUBed';

const query = {
    me: {
        resource: 'me',
    },
}

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
                <div className="icu-table">
                    <ICUTable 
                        data={bedData}
                    />
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
            <span className="t20">Showing ICU Bed status at <b>{activeOrgUnit.name}</b></span>
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

function MyApp(){
    return (
        <Provider store={store}>
            <div className="container">
                <div className="left-column">
                    <OrgUnits />
                </div>
                <div className="right-column">
                    <ViewOrgICU />
                    {/* <ViewICUBeds /> */}
                </div>
            </div>
        </Provider>
    )
}

export default MyApp
