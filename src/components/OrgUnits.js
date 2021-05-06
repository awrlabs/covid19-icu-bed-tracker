import React, { useEffect, useState } from 'react';
import { Card, CircularLoader } from '@dhis2/ui-core';
import { useDispatch, useSelector } from 'react-redux';
import { DataQuery, useDataQuery } from '@dhis2/app-runtime'
import { Treebeard } from 'react-treebeard';
import { setActiveOrgUnit, updateFilteredICUList, setActiveICU } from '../state/appState';
import { ICU_ORG_UNIT_GROUP } from '../constants';
import { getICUsForParent } from "./DataStore";

const query = {
    organisationUnits: {
        resource: 'me.json',
        params: {
            paging: 'false',
            fields: "organisationUnits[id,name,level,children[id, name, level,organisationUnitGroups, children[id, name, level, organisationUnitGroups,children[id, name, level,organisationUnitGroups, children[id, name, level, organisationUnitGroups]]]]]"
        },
    }
}


export default function OrgUnits() {

    const { loading, error, data, refetch } = useDataQuery(query);
    const [orgRoot, setOrgRoot] = useState(null);
    const [cursor, setCursor] = useState(false);
    const dispatch = useDispatch();
    const filterCriteria = useSelector(state => state.app.filterCriteria || {
        typeFilters: {},
        specialityFilters: []
    });
    const activeUser = useSelector(state => state.app.activeUser);

    useEffect(() => {
        if (data) {
            const root = data.organisationUnits.organisationUnits[0];
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

        if (node.level === 3 && !node.processed) {
            var i = node.children.length;
            while (i--) {
                if (!node.children[i].children.some(ch => {
                    return ch.organisationUnitGroups.some(ogp => ogp.id === ICU_ORG_UNIT_GROUP);
                })) {
                    node.children.splice(i, 1);
                }
                node.processed = true;
            }
        } else if (node.level === 4 && !node.processed) {
            var i = node.children.length;
            while (i--) {
                if (!node.children[i].organisationUnitGroups.some(ogp => ogp.id === ICU_ORG_UNIT_GROUP)) {
                    node.children.splice(i, 1);
                }
                node.processed = true;
            }
        }
        setCursor(node);
        setOrgRoot(Object.assign({}, orgRoot))
        selectOU(node);
    }

    const selectOU = (node) => {
        dispatch(setActiveOrgUnit({
            id: node.id,
            name: node.name,
            level: node.level
        }));

        if (node.level === 5) {
            dispatch(setActiveICU({
                id: node.id,
                beds: []
            }))
        } else {
            getICUsForParent(node.id, filterCriteria.typeFilters, filterCriteria.specialityFilters, activeUser.originId).then(icus => {
                dispatch(updateFilteredICUList(icus));
            });
        }

    }

    return (
        <Card>
            {orgRoot && (
                <Treebeard
                    data={orgRoot}
                    onToggle={onToggle}
                />

            )}

            {!orgRoot && <CircularLoader small={true} />}
        </Card>
    )
}
