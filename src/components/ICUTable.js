import React, { useEffect, useState } from 'react';
import {
    Table, TableHead, TableBody,
    TableRow, TableCellHead, TableCell,
    Button, DropdownButton
} from '@dhis2/ui-core';
import { useDispatch } from 'react-redux';
import { getICUStat } from '../state/apiActions';
import { generateICUName } from "../utils";
import { getDistance } from "./DataStore";


function sortData(field, data, state) {
    const {
        setLocationData, sortedBy, setSortedBy,
        sortOrder, setSortOrder
    } = state
    const compare = (locOne, locTwo) => {
        let propertyOne = locOne[field]
        let propertyTwo = locTwo[field]
        let comparison = 0
        if (propertyOne > propertyTwo) {
            comparison = 1
        } else if (propertyOne < propertyTwo) {
            comparison = -1
        }
        if (sortedBy === field) {
            comparison = comparison * -1 * sortOrder //inverts the order
        }
        return comparison
    }
    let result = data.slice()
    result = result.sort(compare)
    setLocationData(result)
    setSortedBy(field)
    setSortOrder(sortOrder * -1)
}

export default function ICUTable({ data, onSelectICU }) {
    const [locationData, setLocationData] = useState([])
    const [sortedBy, setSortedBy] = useState('distance')
    const [sortOrder, setSortOrder] = useState(1)

    const dispatch = useDispatch();

    const stateData = {
        setLocationData,
        sortedBy,
        setSortedBy,
        sortOrder,
        setSortOrder
    }

    useEffect(() => {
        sortData(sortedBy, data, stateData);
    }, [data])

    if (!data) { return <div></div> }

    return (
        <Table>
            <TableHead>
                <TableRow>
                    <TableCellHead >
                        <DropdownButton
                            primary={sortedBy === 'name'}
                            onClick={() => { sortData('name', locationData, stateData) }}
                        >
                            ICU
                        </DropdownButton>
                    </TableCellHead>
                    <TableCellHead >
                        <DropdownButton
                            primary={sortedBy === 'distance'}
                            onClick={() => { sortData('distance', locationData, stateData) }}
                        >
                            Distance
                        </DropdownButton>
                    </TableCellHead>
                    <TableCellHead >
                        <DropdownButton
                            primary={sortedBy === 'total'}
                            onClick={() => { sortData('total', locationData, stateData) }}
                        >
                            TotalBeds
                        </DropdownButton>
                    </TableCellHead>
                    <TableCellHead >
                        <DropdownButton
                            primary={sortedBy === 'available'}
                            onClick={() => { sortData('available', locationData, stateData) }}
                        >
                            AvailableBeds
                        </DropdownButton>
                    </TableCellHead>
                </TableRow>
            </TableHead>
            <TableBody>
                {locationData.map((loc, key) => {
                    let distance = getDistance(loc.parent.id, "MgN1qEkJZ9e");
                    let hours = parseInt(distance.dr / 3600);
                    let mins = parseInt((distance.dr % 3600) / 60);
                    let dstInKm = parseInt(distance.dt / 1000);
                    return (
                        <TableRow key={key}>
                            <TableCell><a href="#" onClick={() => onSelectICU(loc)}>{loc.name} </a></TableCell>
                            <TableCell>
                                <div className="distance-cell">
                                    <div>
                                        {dstInKm} km
                                    </div>
                                    <div className="distance-cell-time">
                                        {hours} hours {mins} mins
                                    </div>
                                </div>
                            </TableCell>
                            <TableCell>{loc.total}</TableCell>
                            <TableCell>{loc.available}</TableCell>
                        </TableRow>
                    )
                })}
            </TableBody>
        </Table >
    )
}