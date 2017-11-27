import React from 'react';

export default (data) => {
    // console.log(data.item);
    let item = data.item;
    return(
        <div className="message">
            {item.link ? <a className="message-photo" href={item.link} target="_blank" >
                            <img src={item.photo} className="message-photo-img" />
                            <span className="message-name"> {item.name} </span>
                        </a>
                    :
                        <a className="message-photo" >
                            <img src={item.photo} className="message-photo-img" />
                            <span className="message-name"> {item.name} </span>
                        </a>
            }
            <div className="message-body" dangerouslySetInnerHTML={{__html: item.text}} />
            <div className="message-date"> {item.date} </div>
        </div>
    )
}