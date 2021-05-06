import React, { useEffect, useState } from 'react';
import {
    Table, TableHead, TableBody,
    TableRow, TableCellHead, TableCell,
    Button, DropdownButton
} from '@dhis2/ui-core';
import { useDispatch } from 'react-redux';


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
                    <TableCellHead className="name-column" >
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
                    return (
                        <TableRow key={key}>
                            <TableCell><a href="#" onClick={() => onSelectICU(loc)}>{loc.name} </a></TableCell>
                            <TableCell>
                                <div className="distance-cell">
                                    <div>
                                        {loc.distance} km
                                    </div>
                                    <div className="distance-cell-time">
                                        {loc.time.hours} hours {loc.time.mins} mins
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