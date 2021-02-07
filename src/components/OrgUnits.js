import React, { useEffect, useState } from 'react';
import { Card } from '@dhis2/ui-core';
import { useDispatch } from 'react-redux';
import { DataQuery, useDataQuery } from '@dhis2/app-runtime'
import { Treebeard } from 'react-treebeard';
import { setActiveOrgUnit, updateFilteredICUList, setActiveICU } from '../state/appState';
import { ICU_ORG_UNIT_GROUP } from '../constants';
import { OrganisationUnitTree } from "@dhis2/ui";
import { getICUsForParent, getICUPaths } from "./DataStore";

const query = {
    organisationUnits: {
        resource: 'organisationUnits.json',
        params: {
            paging: 'false',
            fields: "id,name,level,children,geometry,organisationUnitGroups,parent[id, displayName]"
        },
    }
}

function orgSort(x, y) {
    return x.name.localeCompare(y.name);
}

let traversalCache = {};

export var parentMatrix = {};

export default function OrgUnits() {

    const { loading, error, data, refetch } = useDataQuery(query);
    const [orgRoot, setOrgRoot] = useState(null);
    const [cursor, setCursor] = useState(false);
    const dispatch = useDispatch();

    var traverseResults = [];

    function processList(orgData, children, parent = null) {
        let _children = [];
        for (var child of children) {
            let childOrg = orgData.find((o) => o.id === child.id);

            if (!childOrg) {
                continue;
            }

            if (parent) {
                if (!parentMatrix[childOrg.id]) {
                    parentMatrix[childOrg.id] = {};
                }
                parentMatrix[childOrg.id] = parent.id;
            }

            if (childOrg.children.length === 0) {
                childOrg.children = null;
            } else {
                childOrg.children = processList(orgData, childOrg.children, childOrg);
            }
            _children.push({
                ...childOrg,
                active: false
            });

        }
        let _prunedChildren = [];
        for (var child of _children) {
            traverseResults = [];
            traverse(child, 5);

            // traversalCache[child.id] = null;
            if (traverseResults.length > 0) {
                _prunedChildren.push(child);
                traversalCache[child.id] = {
                    ...child,
                    list: [...traverseResults]
                };
            }
        }
        return _prunedChildren.sort(orgSort);
    }

    function mergeLevel(node, level = 4) {

        if (node.level === level - 1) {
            // at level 3
            let newChildren = [];
            for (var child1 of node.children) {
                if (!child1.children) continue;
                for (var child2 of child1.children) {
                    newChildren.push(child2);
                }
            }
            node.children = newChildren;
            return;
        }

        for (var child of node.children) {
            mergeLevel(child, level);
        }
    }

    useEffect(() => {
        if (data) {
            const orgData = data.organisationUnits.organisationUnits;
            const root = data.organisationUnits.organisationUnits.filter((o) => o.level === 1)[0];
            var start = new Date().getTime();
            root.children = processList(orgData, root.children, root);
            var end = new Date().getTime();
            console.log('Execution time: ' + (end-start));
            parentMatrix[root.id] = "";
            // mergeLevel(root, 4);
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
        selectOU(node);
    }

    function traverse(root, level) {
        if (root.level === level && root.organisationUnitGroups.findIndex(g => g.id === ICU_ORG_UNIT_GROUP) > -1) {
            traverseResults.push({ ...root });
            return;
        }

        if (root.children) {
            for (var child of root.children) {
                if (traversalCache[child.id]) {
                    traverseResults = traverseResults.concat(traversalCache[child.id].list)
                } else {
                    traverse(child, level);
                }
            }
        }
    }

    const selectOU = (node) => {
        //traverseResults = [];
        // traverse the tree and find level 6 bois
        //traverse(node, 5);

        // let icus = [];
        // console.log("Traverse", traverseResults);
        // for (var icu of traverseResults) {
        //     icus.push({
        //         ...icu,
        //         distance: 0,
        //         total: null,
        //         available: null,
        //         geometry: traversalCache[icu.parent.id] && traversalCache[icu.parent.id].geometry
        //             && traversalCache[icu.parent.id].geometry.type === "Point" ?
        //             {
        //                 lat: traversalCache[icu.parent.id].geometry.coordinates[1],
        //                 lng: traversalCache[icu.parent.id].geometry.coordinates[0]
        //             } : {
        //                 lat: 0,
        //                 lng: 0
        //             },
        //         isLoading: false
        //     })
        // }


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
            let icus = getICUsForParent(node.id);
            dispatch(updateFilteredICUList(icus));
            console.log("ICUs for parent", icus);
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
        </Card>
    )
}
