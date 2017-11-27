import React from 'react';

export default (data) => {
    // console.log(data.item);
    let item = data.item;
    return(
        item.link ? <a className="people-item"
                        href={item.link}
                        target="_blank"
            >
                <img src={item.photo} alt="" className="people-photo"/>
                {item.userName}
            </a>
            :
            <a className="people-item" >
                <img src={item.photo} alt="" className="people-photo"/>
                {item.userName}
            </a>
    )
}