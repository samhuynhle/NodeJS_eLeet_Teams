import { Component, OnInit, ViewChild, AfterViewInit, Input } from '@angular/core';
import { GameService } from '../game.service';
import { HttpService } from '../http.service';
import { Router } from '@angular/router';
import { delay } from 'q';

@Component({
  selector: 'app-code-editor',
  templateUrl: './code-editor.component.html',
  styleUrls: ['./code-editor.component.css']
})
export class CodeEditorComponent implements OnInit {
  @Input() game_instance: any;
  @Input() current_question: any;
  @Input() question_number: any;
  @ViewChild('editor', {static: false}) editor;
  //For Sam's code: message will contain the code that the users are sending
  message : String = '';
  rem_guesses = 3;
  gameEnd : Boolean = false;
  gameStart: Boolean = false;
  error_message : String = "";
  seconds = 0;
  minutes = 25;
  counter = 10;
  game_text : String = `You have ${this.rem_guesses} attempt(s) remaining!`
  constructor(
    private gameService: GameService,
    private _httpService: HttpService,
    private _router: Router
  ) { }

  ngOnInit() {
    this.gameService
      .getMessages()
      .subscribe((message: string) => {
        this.message = message;
      });
    this.gameService
      .get_remaining_attempts()
      .subscribe((attempts) => {
        console.log(attempts);
        this.rem_guesses = attempts['rem_attempts'];
        this.gameEnd = attempts['game_end'];
        this.game_text = attempts['game_text'];
        this.error_message = attempts['error_message']
        if (this.rem_guesses == 0) {
          this.gameEnd = true;
        }
      });
    this.gameService
      .beginGame()
      .subscribe((data)=> {
        this.gameStart = true;
        this.countdownTimer();
      })

    this.gameService 
      .begin_new_game()
      .subscribe((data) => {
        if('current_question' in data) {
          this.current_question = data['current_question'];
        }
        this.seconds = data['seconds'];
        this.minutes = data['minutes'];
        this.counter = data['counter'];
        this.countdownTimer();
      });
  }
  
  ngAfterViewInit() {
    //this.editor.theme = "eclipse";
    this.editor.mode = 'javascript';
    this.editor.getEditor().setOptions({
        enableBasicAutocompletion: true,
        showLineNumbers: true,
        tabSize: 4
    });
  }

  sendMessage() {
    this.gameService.sendMessage(this.message);
  }

  newGame() {
    this.question_number += 1;
    this.current_question = this.game_instance.questions[this.question_number]
    console.log(this.current_question);
    this.message = "";
    this.rem_guesses = 3;
    this.game_text = `You have ${this.rem_guesses} attempt(s) remaining!`;
    this.gameEnd = false;
    this.seconds = 0;
    this.minutes = 25;
    this.counter = 1500;
    this.sendMessage();
    this.countdownTimer();
    this.gameService.newGame({
      'current_question' : this.current_question,
      'seconds' : this.seconds,
      'minutes' : this.minutes,
      'counter' : this.counter
    })
    this.gameService.changeAttempts({'rem_attempts': this.rem_guesses,
      'game_text' : `You have ${this.rem_guesses} attempt(s) remaining!`,
      'game_end' : false,
      'error_message' : ""});
  }

  checkAnswer() {
    var catdoodle = this.message;
    var data = {
      script: catdoodle,
      question_name: this.current_question.name,
      game_id: this.game_instance['_id']
    }
    let observable = this._httpService.check_submission(data)
    observable.subscribe((data)=>{
      console.log("from express server!", data);
      this.rem_guesses = this.rem_guesses - 1;
      //Check if user got right, if so, then send the rem_guesses, the game_text to be "yay!" and gameEnd to true
      if(data['jdoodle']['message'] == 'Correct!') {
        this.gameEnd = true;
        this.game_text = "Correct!"
        this.error_message = "";
        this.gameService.changeAttempts({'rem_attempts': this.rem_guesses,
          'game_text' : "Correct!",
          'game_end' : true,
          'error_message' : ""});
      }
      //Check if user is out of attempts, if so, then send the rem_guesses, the game_text to be "no :(" and gameEnd to true
      else if (this.rem_guesses == 0) {
        this.gameEnd = true;
        this.game_text = "You are out of attempts :("
        this.gameService.changeAttempts({'rem_attempts': this.rem_guesses,
          'game_text' : "You are out of attempts :(",
          'game_end' : true,
          'error_message' : ""});
      }
      //Otherwise just change the rem_guesses, the game text to print that they got it incorrect and the remaining guesses 
      //and leave gameEnd as false
      else {
        this.error_message = `Incorrect output: ${data['jdoodle']['output']}`
        this.game_text = `You have ${this.rem_guesses} attempt(s) remaining!`
        this.gameService.changeAttempts({'rem_attempts': this.rem_guesses,
          'game_text' : `You have ${this.rem_guesses} attempt(s) remaining!`,
          'game_end' : false,
          'error_message' : `Incorrect output: ${data['jdoodle']['output']}`});
      }
    })
  }

  async countdownTimer() {
    for (let i = 1500; i > 0; i--){
      await delay(1000);
      this.counter = this.counter -1;
      // console.log(this.counter)
      if(this.counter == -1){
        this.gameEnd = true;
        this.game_text = 'You ran out of time, try again!';
        this.error_message = '';
        return
      }
      if(this.seconds == 0){
        this.seconds = 59;
        this.minutes = this.minutes - 1;
      }
      else{
        this.seconds = this.seconds - 1;
      }
    }
  }

  startGame () {
    this.gameStart = true;
    this.gameService.startGame();
    this.countdownTimer();
  }

}
