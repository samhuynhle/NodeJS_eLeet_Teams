import { Injectable } from '@angular/core';
import * as io from 'socket.io-client';
import { Observable } from 'rxjs'

@Injectable({
  providedIn: 'root'
})
export class GameService {
  private socket;  
  constructor() {
    this.socket = io();
   }

   public sendMessage(message) {
    this.socket.emit('message', message);
  }

  public getMessages = () => {
      console.log("This was called");
      return Observable.create((observer) => {
          this.socket.on('new-message', (message) => {
              observer.next(message);
          });
      });
    }
}
