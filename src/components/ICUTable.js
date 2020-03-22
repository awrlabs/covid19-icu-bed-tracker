import React, { useEffect, useState } from 'react';
import { 
        Table, TableHead, TableBody,     
        TableRow, TableCellHead, TableCell,
        Button
    } from '@dhis2/ui-core';

export default function ICUTable({ data }){
    if(!data){ return <div></div> }

    return(
        <Table>
            <TableHead>
                <TableRow>
                    <TableCellHead>ICU</TableCellHead>
                    <TableCellHead>Distance</TableCellHead>
                    <TableCellHead>Total Beds</TableCellHead>
                    <TableCellHead>Available Beds</TableCellHead>
                    <TableCellHead>Contact</TableCellHead>
                </TableRow>
            </TableHead>
            <TableBody>
                {data.map((loc, key) => (
                <TableRow key={key}>
                    <TableCell>{loc.name}</TableCell>
                    <TableCell>{loc.distance}</TableCell>
                    <TableCell>{loc.total}</TableCell>
                    <TableCell>{loc.available}</TableCell>
                    <TableCell>
                        <p>Dr. John Doe</p>
                        <p>+94771234568</p>
                        <p>+94717894562</p>
                    </TableCell>
                </TableRow>
                ))}
            </TableBody>
        </Table>
    )
}