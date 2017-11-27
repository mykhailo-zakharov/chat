import React, { Component } from 'react';
import io from 'socket.io-client';
import MessageItem from "./MessageItem";
import PeopleItem from "./PeopleItem";
import TypingList from "./TypingList"


export default class Chat extends Component {
    constructor(){
        super();

        this.state = {
            userName: "Not name",
            photo: "/user.png",
            link: "",
            connected: false,
            typing: false,
            FADE_TIME: 150,
            TYPING_TIMER_LENGTH: 400,
            COLORS: [
                '#e21400', '#91580f', '#f8a700', '#f78b00',
                '#58dc00', '#287b00', '#a8f07a', '#4ae8c4',
                '#3b88eb', '#3824aa', '#a700ff', '#d300e7'
            ],
            inputMesssage: "",
            messages: [],
            listTyping: [],
            countPeople: 0,
            listPeople: [],
            windowIsBlur: false,
            inputHeight: null,
            inputHeightDiff: 0
        };

        this.date = new Date();
        console.log("constructor: ", new Date() - this.date);

        // this.socket = io('http://localhost:3000');
        this.socket = io(window.location.origin, {
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionDelayMax : 5000,
            reconnectionAttempts: 99999
        });
        // this.socket = io();
        this.setSocket();
        this.brouserEvent();

        //for testing
        window.self = this;
        Notification.requestPermission();
    }

    componentDidMount = () => {
        this.setState({inputHeight: this.input.clientHeight});
    }

    brouserEvent = () => {
        window.addEventListener("blur", ()=> this.setState({windowIsBlur: true}));
        window.addEventListener("focus", ()=> this.setState({windowIsBlur: false}));
    }

    setSocket = () => {
        let self = this;

        this.socket.on('new message', function (data) {
            self.newMessage(data);
        });

        this.socket.on('user joined', function (data) {
           self.userJoined(data);
        });

        this.socket.on('user left', function (data) {
           self.userLeft(data);
        });

        this.socket.on('typing', function (data) {
            self.addChatTyping(data);
        });

        this.socket.on('stop typing', function (data) {
            self.removeChatTyping(data);
        });

        this.socket.on("connect", () => {
            this.getUserData();
        } );

        this.socket.on('reconnect', (ctx, number) => {
            console.log("reconnect: ", number);
        });

        console.log("setted socket events: ", new Date() - this.date);
    }

    userJoined = (data) => {
        console.log(data.userData.userName + ' joined');
        if(this.state.listPeople.length){
            this.state.listPeople.forEach(item => {
                if(item.userId === data.userData)
                    return;
            });
            let newList = this.state.listPeople;
            newList.unshift(data.userData);
            this.setState({listPeople: newList});
        } else {
            let listPeople = Object.keys(data.total).map(item => {
                return {userId: item, ...data.total[item]};
            });
            this.setState({listPeople, isAddUser: true});
        }
        this.input.focus();
    }

    userLeft = (data) => {
        console.log(data.userData.userName + ' left');
        let listPeople = Object.keys(data.total).map(item => {
            return {userId: item, ...data.total[item]};
        });
        this.setState({listPeople});
    }

    addChatTyping(name){
        if(name === this.state.userName || this.state.listTyping.filter(item => item === name).length){
            return;
        }
        let list = this.state.listTyping;
        list.push(name);
        this.setState({ listTyping: list});
        this.scrollMessageToBottom();
    }

    removeChatTyping(name){
        let list = this.state.listTyping.filter(item => item !== name);
        this.setState({ listTyping: list});
        this.scrollMessageToBottom();
    }

    newMessage = (data) => {
        console.log("the message was received", data);
        let date = new Date();
        let item = {
            name: data.userData && data.userData.userName || "not name",
            photo: data.userData && data.userData.photo || "/user.png",
            link: data.userData && data.userData.link || "",
            text: data.message,
            date: date.getHours() + ":" + date.getMinutes() + ":" + date.getSeconds()
        };
        let list = this.state.messages;
        list.push(item);
        this.setState({ messages: list});
        this.scrollMessageToBottom();
        this.notificationToBrowser(item);
    }

    notificationToBrowser = (item) => {
        if(!this.state.windowIsBlur) return;
        let options = {
            body: item.text,
            icon: item.photo
        };
        let title = `New message from ${item.name}`;
        new Notification(title,options);
    }

    scrollMessageToBottom = () => {
        this.messages.scrollTop = this.messages.scrollHeight;
    }

    sendMessage = () => {
        let message = this.input.innerHTML;
        if(!message){
            return;
        }
        this.socket.emit('new message', message);
        this.socket.emit('stop typing', this.state.userName);
        console.log("sent Message: ", message);
        this.input.innerHTML = "";
        this.setState({inputHeightDiff: 0});
        // console.log(message);
    }

    onChangeInput = () => {
        // change height svg
        this.setState({inputHeightDiff: this.input.clientHeight - this.state.inputHeight});
        // scroll list message to bottom
        this.scrollMessageToBottom();
        let self = this;
        this.setState({typingDate: new Date()});
        this.onTypingOn();
        setTimeout(self.onTypingOff, 3000);
    }

    onKeyDown = (e) => {
        let message = this.input.innerHTML;
        if(e.keyCode == 13 && (e.ctrlKey || e.metaKey) && message){
            this.sendMessage();
        }
    }

    onTypingOn = () => {
        this.socket.emit('typing', this.state.userName);
    }

    onTypingOff = () => {
        if(new Date() - this.state.typingDate < 3000){
            return;
        }
        this.socket.emit('stop typing', this.state.userName);
    }

    getUserData = () => {
        let self = this;
        let options = {
            method: "GET",
            credentials: 'include'
        };

        console.log("start get user data: ", new Date() - this.date);


        fetch("/userData",options)
            .then(data => data.json())
            .then(userData => {
                console.log("finish get user data: ", new Date() - this.date);
                // let data = userData;
                self.setState(userData);
                // self.socket.emit('add user', userData);
                // setTimeout( () => self.addUser(), 500)
                // self.addUser(userData)
                self.launchAddUser();
            })
            .catch(error => console.error(error));
    }

    launchAddUser = () => {
        if(this.state.isAddUser) {
            this.socket.emit('new message', "< Hi >");
            return;
        } else {
            this.addUser();
            setTimeout(()=>{this.launchAddUser()}, 700);
        }
    }

    addUser = () => {
        let data = {userName: this.state.userName, photo: this.state.photo, link: this.state.link};
        console.log('add user', data.userName);
        // this.socket.emit('new message', "everyone joined");
        this.socket.emit('add user', data);

    }

    render(){
        let inputHeightDiff = this.state.inputHeightDiff;
        return(
            <div className="container">
                <div className="window browser fading">
                    <div className="header">
                        <a href="/logout" className="bullet-container" title="Logout">
                            <span className="bullet bullet-red"></span>
                            <span className="bullet bullet-yellow"></span>
                            <span className="bullet bullet-green"></span>
                        </a>
                        <span className="title"><span className="scheme">https://</span>chat-hell.herokuapp.com</span>
                    </div>

                    <p className="window-header">Welcome to the <b>Hell</b></p>

                    <div className="body">
                            <div className="messages"
                                 ref={(messages) => { this.messages = messages; }}
                                 style={{marginBottom: inputHeightDiff ? inputHeightDiff / 2 : 0}}
                            >

        {this.state.messages.length && this.state.messages.map((item, index)=><MessageItem key={index} item={item}/>) || null}

        {this.state.listTyping.length && <TypingList list={this.state.listTyping} /> || null}

                        </div>

                        <div className="message-input-container">
                            <a className="username-link" href={this.state.link} target="_blank" title={this.state.userName}>
                                {this.state.photo && <img src={this.state.photo} className="username-photo" />}
                                <span className="username-container">{this.state.userName}</span>
                            </a>
                            <div className="message-input-wrap">
                                <div className="message-input"
                                       onKeyDown={this.onKeyDown}
                                       onKeyUp={this.onChangeInput}
                                        contentEditable="true"
                                        ref={(input) => { this.input = input} }
                                />
                            </div>
                            <button onClick={this.sendMessage} className="message-sent">Sent</button>

                            {/*<svg width={568} height={inputHeightDiff} className="input-deco-left">*/}
                                {/*<polygon points={`0,${inputHeightDiff} 135,0 515,0 568,${inputHeightDiff}`} />*/}
                            {/*</svg>*/}
                            <svg width={568} height={inputHeightDiff ? inputHeightDiff + 50 : 0}
                                 className="input-deco-left"
                                 viewBox={`0 -50 568 ${inputHeightDiff ? inputHeightDiff + 50 : 0}`}>
                                <path d={`M0,${inputHeightDiff} T135,0 515,0 568,${inputHeightDiff}`} />
                            </svg>
                        </div>

                    </div>
                </div>

                <div className="people-box browser">
                    <div className="browser header">В чате ({this.state.listPeople.length})</div>
                    <div className="people-list">
                        {this.state.listPeople.length &&
                            this.state.listPeople.map(item => <PeopleItem key={item.userId} item={item} /> ) || <a className="people-item" >Загрузка...</a>}
                    </div>
                </div>
            </div>
        )
    }
}