import React, { useEffect, useState } from 'react';
import { useDataQuery } from '@dhis2/app-runtime';
import { PROGRAM, BED_TEI_TYPE } from "../constants";

import ForerunnerDB from "forerunnerdb";
import distances from "./distances"; import { CircularLoader } from '@dhis2/ui-core';

let fdb = new ForerunnerDB();
let bedsDb = fdb.db("beds");
let bedsCollection = bedsDb.collection("beds", { primaryKey: "trackedEntityInstance" });
let bedEventsCollection = bedsDb.collection("bedEvents", { primaryKey: "event" });
let icusCollection = bedsDb.collection("icus", { primaryKey: "id" });

//for debug
window.bc = bedsCollection;
window.ebc = bedEventsCollection;
window.ic = icusCollection;

bedsCollection.remove();
bedEventsCollection.remove();
icusCollection.remove();

let availableBeds = [];

// /bc.find({},{$join:[{"bedEvents":{"trackedEntityInstance":"trackedEntityInstance",$as:"events",$require:false,$multi:true}}]})

// todo move API calls to apiActions

function queryForICU(icuId, filters, expertiseFilters = [], distanceOrigin) {
    //console.log("Filters", filters);

    let total = bedsCollection.count({
        orgUnit: {
            $eq: icuId
        }
    });

    let dbFilters = {};

    Object.keys(filters).forEach(k => {
        if (filters[k].length > 0) {
            dbFilters[k] = {
                $in: filters[k].map(fk => fk.value)
            }
        }
    });

    expertiseFilters.forEach(fil => {
        dbFilters[fil.value] = {
            $eq: "true"
        }
    });
    //console.log("DB Filters", dbFilters, filters);


    let available = bedsCollection.count({
        orgUnit: {
            $eq: icuId
        },
        trackedEntityInstance: {
            $in: availableBeds
        },
        ...dbFilters
        // },
        // events: {
        //     dataValues: { dataElement: { $eq: "MtYPOv0wqCg" }, value: { $eq: "Discharged" } }
        // }
    });

    // , { $join: [{ "bedEvents": { "trackedEntityInstance": "trackedEntityInstance", $as: "events", $require: false, $multi: true } }] }

    let orgUnit = icusCollection.find({ id: { $eq: icuId } })[0];

    let distanceObj = getDistance(orgUnit.parent.id, distanceOrigin);
    let hours = parseInt(distanceObj.dr / 3600);
    let mins = parseInt((distanceObj.dr % 3600) / 60);
    let time = { hours, mins };
    let distance = parseInt(distanceObj.dt / 1000);

    return { available, total, orgUnit, distance, time };
}

export function getICUsForParent(parentId, filters, expertiseFilters = [], distanceOrigin = "") {
    return new Promise((resolve, reject) => {
        resolve(
            icusCollection.find({ parents: { $eq: parentId } }).map(icu => {
                return { ...icu, ...queryForICU(icu.id, filters, expertiseFilters, distanceOrigin) }
            }).filter(icu => icu.available > 0)
        );
    });
}

export function getICUPaths() {
    return [...icusCollection.find({}).map(icu => icu.path)];
}

export function getDistance(i1, i2) {
    let key = [i1, i2];
    key.sort();
    return distances[key.join("_")] || { dr: 0, dt: 0 };
}

export function getBedsForIcu(icuId) {
    return [...bedsCollection.find({
        orgUnit: {
            $eq: icuId
        }
    })];
}

export function swapLatestEvent(event) {
    bedEventsCollection.remove({
        trackedEntityInstance: {
            $eq: event.trackedEntityInstance
        }
    });
    bedEventsCollection.insert(event);
}

export function getLastEvent(teiId) {
    console.log("Last event of ", teiId);
    let events = bedEventsCollection.find({ trackedEntityInstance: { $eq: teiId } });
    if (events.length > 0) {
        return events[0];
    }
    return undefined;
}

export function removeBed(teiId, removeEvents = false) {
    bedsCollection.remove({ trackedEntityInstance: { $eq: teiId } });
    if (removeEvents) {
        bedEventsCollection.remove({
            trackedEntityInstance: {
                $eq: teiId
            }
        });
    }
}

export function upsertBed(teiId, tei) {
    let atts = new Map();
    tei.attributes.forEach(att => {
        atts.set(att.attribute, att);
    });

    let enrollments = tei.enrollments;

    let found = bedsCollection.find({ trackedEntityInstance: { $eq: teiId } });
    if (found.length > 0) {
        found = found[0];
        removeBed(teiId);

        found.attributes.forEach(att => {
            if (!atts.has(att.attribute)) {
                atts.set(att.attribute, att);
            }
        });

        enrollments = found.enrollments;
    }

    let finalObject = {
        trackedEntityInstance: teiId,
        orgUnit: tei.orgUnit,
        attributes: Array.from(atts.values()),
        enrollments: enrollments || []
    };

    for (let key of atts.keys()) {
        finalObject[key] = atts.get(key).value;
    }

    bedsCollection.insert(finalObject);
}

function asyncInsert(collection, data) {
    return new Promise((resolve, reject) => {
        collection.insert(data, (result) => {
            //console.log("Data inserted", result);
            resolve(result);
        });
    });
}

export function ICUHasParent(parent, icudId) {
    return icusCollection.find({
        id: {
            $eq: icudId
        }
    }).some(icu => icu.parents.some(p => p === parent));
}

export default function DataStore({ children }) {

    const [dataLoading, setDataLoading] = useState(true);

    const { loading, error, data, refetch } = useDataQuery({
        beds: {
            resource: 'trackedEntityInstances',
            params: {
                ouMode: "ACCESSIBLE",
                fields: "trackedEntityInstance,attributes[attribute,value],orgUnit,enrollments",
                trackedEntityType: BED_TEI_TYPE,
                paging: "false"
            },
        },
        bedEvents: {
            resource: 'events',
            params: {
                program: PROGRAM,
                ouMode: "ACCESSIBLE",
                status: "ACTIVE",
                paging: "false",
                fields: "trackedEntityInstance,dataValues[dataElement,value]"
            },
        },
        icus: {
            resource: 'organisationUnitGroups/PTahQgpjqyQ',
            params: {
                fields: 'organisationUnits[id,displayName,parent[id,displayName,geometry],contactPerson,phoneNumber,path]',
                paging: "false"
            }
        }
    });
    //console.log("Results", loading, error, data, refetch);

    useEffect(() => {
        if (!loading && data) {
            let icus = data.icus.organisationUnits.map(icu => {
                let lat = 0;
                let lng = 0;
                if (icu.parent.geometry) {
                    lat = icu.parent.geometry.coordinates[1];
                    lng = icu.parent.geometry.coordinates[0];
                }

                return {
                    ...icu, parents: icu.path.split("/"), geometry: {
                        lat,
                        lng
                    }
                }
            });

            //console.log("Adding ", icus.length, "ICUs");

            Promise.all([
                asyncInsert(
                    bedsCollection, data.beds.trackedEntityInstances.filter((te) => {
                        if (te.enrollments.length > 1) {
                            console.warn("Found a bed with multiple enrollments");
                        }
                        return te.enrollments.length === 1 && te.enrollments[0].status === "ACTIVE";
                    }).map(te => {
                        te.attributes && te.attributes.forEach(at => {
                            te[at.attribute] = at.value;
                        });
                        //delete te.attributes;
                        return te;
                    })
                ),
                asyncInsert(bedEventsCollection, data.bedEvents.events),
                asyncInsert(icusCollection, icus.map(icu => {
                    icu.name = icu.parent.displayName + " - " + icu.displayName;
                    return icu;
                })),
            ]).then(() => {
                setDataLoading(false);

                // setting available beds
                availableBeds = bedEventsCollection.find({
                    dataValues: { dataElement: { $eq: "MtYPOv0wqCg" }, value: { $eq: "Discharged" } }
                }).map(bed => bed.trackedEntityInstance);

                let noEvents = bedsCollection.find({
                    trackedEntityInstance: {
                        $nin: bedEventsCollection.find().map(x => x.trackedEntityInstance)
                    }
                }).map(bed => bed.trackedEntityInstance);


                availableBeds = availableBeds.concat(noEvents);
            });
        } else if (error) {
            console.error("Error", error);
        }
    });

    let render = dataLoading ? <CircularLoader /> : children;

    return (
        <div className="loader-wrapper">
            {render}
        </div>
    );
};