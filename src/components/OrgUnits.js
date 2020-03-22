import React, { useEffect, useState } from 'react';
import { Card } from '@dhis2/ui-core';
import { useDispatch } from 'react-redux';
import { DataQuery, useDataQuery } from '@dhis2/app-runtime'
import { Treebeard } from 'react-treebeard';
import { setActiveOrgUnit } from '../state/appState';

const query = {
    organisationUnits: {
        resource: 'organisationUnits.json',
        params: {
            paging: 'false',
            fields: "id,name,level,children"
        },
    }
}

export default function OrgUnits(){
    
    const { loading, error, data, refetch } = useDataQuery(query);
    const [orgRoot, setOrgRoot] = useState(null);
    const [cursor, setCursor] = useState(false);
    const dispatch = useDispatch();

    function processList(orgData, children){
        let _children = [];
        for(var child of children){
            let childOrg = orgData.filter((o) => o.id === child.id);

            if(childOrg.length === 1){
                childOrg = childOrg[0];
                if(childOrg.children.length === 0){
                    childOrg.children = null;
                }else{
                    childOrg.children = processList(orgData, childOrg.children);
                }                
                _children.push(childOrg);
            }            
        }
        return _children;
    }

    useEffect(() => {
        if(data){
            const orgData = data.organisationUnits.organisationUnits;
            const root = data.organisationUnits.organisationUnits.filter((o) => o.level === 1)[0];
            root.children = processList(orgData, root.children);
            
            setOrgRoot(root);
        }
    }, [loading]);

    const onToggle = (node, toggled) => {
        if (cursor) {
            cursor.active = false;
        }
        node.active = true;
        if (node.children) {
            node.toggled = toggled;
        }
        setCursor(node);
        setOrgRoot(Object.assign({}, orgRoot))
        dispatch(setActiveOrgUnit({
            id: node.id,
            name: node.name,
            level: node.level
        }));
    }

    return (
        <Card>
            {orgRoot && (
                <Treebeard
                    data={orgRoot}
                    onToggle={onToggle}
                />
            )}
        </Card>
    )
}
