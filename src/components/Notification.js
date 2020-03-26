import React from 'react';
import { useSelector, useDispatch } from 'react-redux'
import {
    AlertBar
} from '@dhis2/ui-core';

export default function Notification(props) {

    const {isOpen, message, type} = useSelector((state)=>(state.notification))

    if(!isOpen) return null
    
    return (
        <AlertBar
            duration={5000}
            icon
            critical={type==='error'}
            warning={type==='warning'}
            success={type==='success'}
        >
            {message}
        </AlertBar>
    )
}