var doodle = {
  url: 'ws://i.tunnel.moeou.com:7451/test',
  audioUrl: {                 
    getScore: './assets/audio/getPoint.ogg',
    error: './assets/audio/err.wav',
    btnClick: './assets/audio/btnClick.wav',
    ready: './assets/audio/ready.ogg',
    unReady: './assets/audio/unReady.ogg',
    exitRoom: './assets/audio/exitRoom.wav',
    time15: './assets/audio/time15.wav',
    timesOver: './assets/audio/timesOver.wav',
    taunt: './assets/audio/taunt.wav',
    encourage: './assets/audio/encourage.wav',
    nisal: './assets/audio/nisal.wav'
  },
  drawData: [],                // 存放绘画记录
  drawDataCount: 0,            // 存放绘画笔数
  canvas: null,                // 画布对象
  cxt: null,                   // 画布的上下文环境
  lineColor: '#000',           // 线颜色 默认黑色
  lineWidth: 7,                // 线宽度 默认7
  socket: null,                // WebSocket对象
  playerName: null,            // 玩家名字
  playerId: null,              // 玩家id
  roomId: null,                // 当前房间号
  playerCount: null,           // 用户总数
  isInRoom: false,             // 是否在房间内
  playerList: {},              // 所有用户对象列表
  isMyTurn: false,             // 是否轮到我画
  isPlaying: false,            // 是否处于游戏中
  curPainter: null,            // 当前画的用户
  timer: null,                 // 回合定时器
  tipsCount: 0,                // 提示量
  tipsQueue: [],               // 提示队列
  waitToDeleteTipsQueue: [],   // 待清空提示队列
  tipsColor: [],               // 提示颜色集合
  timerFlag: true,             // 15秒提示哨兵
  isAnswered: false,           // 这轮是否已经回答出题目
  whichRoom: 0,                // 房内公屏聊天哨兵
  isNisaling: false,

  // 鼓励事件
  encourage: function(e){
    var that = this;
    $('#encourage').click(function(){
      $(this).attr('disabled', 'disabled');
      $('#taunt').attr('disabled', 'disabled');
      that.sendMsg('ROOMCHAT#JUDGEEVENTDATA|encourage|' + that.curPainter);
    });
  },

  // 切换聊天
  swChatRoom: function(){
    var that = this;
    function chgChatRoom(){
      $('#haveMsg0').css('display', 'none');
      $('#haveMsg1').css('display', 'none');

      $('.chgChatRoom').removeClass('active');
      $(this).addClass('active');
      var target = $(this).val() === '0' ? '.chatRoom0' : '.chatRoom1';
      var hider = '.chatRoom' + ($(this).val() === '0' ? '1' : '0');
      $(hider).addClass('animated flipOutX');
      $(target).css('display', 'block');
      $(target).addClass('animated flipInX');
      that.whichRoom = parseInt($(this).val());
      setTimeout(function(){
        $(hider).removeClass('animated flipOutX');
        $(hider).css('display', 'none');
        $(target).removeClass('animated flipInX');
      }, 1000);
      $('.chgChatRoom').off();
      setTimeout(function(){
        that.swChatRoom();
      }, 1000);
    }
    $('.chgChatRoom').click(chgChatRoom);
  },

  // 嘲讽事件
  taunt: function(e){
    var that = this;
    $('#taunt').click(function(){
      $(this).attr('disabled', 'disabled');
      $('#encourage').attr('disabled', 'disabled');
      that.sendMsg('ROOMCHAT#JUDGEEVENTDATA|taunt|' + that.curPainter);
    });
  },

  // 预加载音源
  initAudio: function(){
    console.log('加载音源');
    for(var i in this.audioUrl){
      var audio = new Audio(this.audioUrl[i]);
      console.log(this.audioUrl[i] + '加载中');
      // 回收音源
      (function(obj){
        setTimeout(function(){
          delete obj;
        }, 5000);
      })(audio)
    }
  },

  // 初始化提示颜色
  initTipsColor: function(e){
    this.tipsColor.push('#FFE4E1');
    this.tipsColor.push('#FFB6C1');
    this.tipsColor.push('#FF8C00');
    this.tipsColor.push('#FF1493');
    this.tipsColor.push('#FA8072');
    this.tipsColor.push('#F5DEB3');
    this.tipsColor.push('#F4A460');
    this.tipsColor.push('#E9967A');
    this.tipsColor.push('#DC143C');
    this.tipsColor.push('#DA70D6');
    this.tipsColor.push('#CD5C5C');
    this.tipsColor.push('#AFEEEE');
    this.tipsColor.push('#9932CC');
    this.tipsColor.push('#8A2BE2');
    this.tipsColor.push('#87CEEB');
    this.tipsColor.push('#3CB371');
    this.tipsColor.push('#00CED1');
    this.tipsColor.push('#FF7F50');
    this.tipsColor.push('#E0FFFF');
    this.tipsColor.push('#DEB887');
    this.tipsColor.push('#DDA0DD');
  },

  // 显示提示
  showTips: function(str, time){
    var that = this;

    var tips = $('<div></div>');
    var tipContent = $('<span></span>');

    tipContent.html(str);
    tipContent.addClass('tipContent');
    tipContent.css('background-color', this.tipsColor[parseInt(Math.random() * this.tipsColor.length)]);
    tips.addClass('tips tips' + this.tipsCount);

    tips.append(tipContent);
    tips.css('display', 'none');
    $('#tipsWarpper').append(tips);

    tips.css('display', 'block');
    $('.tips' + this.tipsCount).css('display', 'block');
    $('.tips' + this.tipsCount).addClass('animated bounceIn');
    this.tipsQueue.unshift('.tips' + this.tipsCount);
    this.tipsCount ++;

    setTimeout(function(){
      $(that.tipsQueue[that.tipsQueue.length - 1]).removeClass('animated bounceIn');
      $(that.tipsQueue[that.tipsQueue.length - 1]).addClass('animated bounceOut');
      that.waitToDeleteTipsQueue.unshift(that.tipsQueue.pop());
      // 回收提示框
      setTimeout(function(){
        $(that.waitToDeleteTipsQueue[0]).remove();
        that.waitToDeleteTipsQueue.shift();
      }, 1000);
      this.tipsCount --;
    }, time);

  },

  // 设置线条宽度
  setLineWidth: function(e){
    var that = this;
    $('#setLineWidth').change(function(){
      that.lineWidth = $(this).val();
      $('#rangeNum').html($(this).val());
    });
  },

  // 出现错误
  socketEroor: function(){
    var that = this;
    this.socket.onerror = function(e){
      alert.html('组织上好像出现了什么错误...');
    }
  },

  // 连接丢失
  socketClose: function(){
    var that = this;
    this.socket.onclose = function(e){
      alert('组织把你抛下不管了...');
    }
  },

  // 设置错误提示动画
  setErrorAnimate: function(target){
    $(target).addClass('animated shake');
    this.audio('error');
    setTimeout(function(){
      $(target).removeClass('animated shake');
    }, 1000);  
  },

  // 退出房间
  exitTheRoom: function(e){
    var that = this;
    $('#exitRoom').click(function(){
      if(that.isInRoom){
        that.audio('exitRoom');
        $('#setRoomNumber').off('click');
        $('#roomNumber').off('keypress');
        $('#roomSelector').removeClass('animated bounceOut');
        $('#roomSelectorWarpper').removeClass('animated bounceOut');        
        $('#drawBoardWarpper').removeClass('animated bounceIn');
        $('#roomSelectorWarpper').css('display', 'block');
        $('#roomSelectorWarpper').addClass('animated bounceIn');  
        $('#drawBoardWarpper').addClass('animated bounceOut');
        that.isInRoom = false;
        that.sendMsg('EXIT#1');
        that.playerList = {};
        $('.user').remove();
        setTimeout(function(){
          $('#drawBoardWarpper').css('z-index', '10');
          $('#drawBoardWarpper').css('display', 'none');
          $('#roomNumber').focus();   
        }, 200);
        setTimeout(function(){
          that.enterRoom();
        }, 900);
      }
    });
  },

  // 设置玩家名字
  setName: function(e){
    var that = this;       
    function setNameInner(){
      if($('#playerName').val() === ''){
        $('#setNameAlert').html('DALAO们就是喜欢用null做名字_(:°з」∠)_');
        that.setErrorAnimate('#setNameAlert');
        return;
      }
      if($('#playerName').val().length > 7){
        $('#setNameAlert').html('这个...名字还是短一点 比较好吧 七个字差不多了吧');
        that.setErrorAnimate('#setNameAlert');
        return;
      }
      if($('#playerName').val().match('#') || $('#playerName').val().match('<') || $('#playerName').val().match('>')){
        $('#setNameAlert').html('你看我这记性.. # > < 这三个符号 也是不能出现的 不利于谈笑风生');
        that.setErrorAnimate('#setNameAlert'); 
      }
      if(that.playerId !== 'undefined' && that.playerId !== null){
        that.audio('btnClick');
        that.sendMsg('SETNAME#' + $('#playerName').val());
        that.playerName = $('#playerName').val();
        $('#setNamePanel').removeClass('animated bounceIn');
        $('#setNamePanel').addClass('animated bounceOut');
        setTimeout(function(){
          $('#roomSelectorWarpper').css('display', 'block');
          $('#setNamePanel').addClass('animated bounceIn');
          $('#roomNumber').focus();
        }, 200);
        setTimeout(function(){
          $('#setNameWarpper').empty();
        }, 1000);
      }
    }
    $('#setNameBtn').click(setNameInner);
    $('#playerName').keypress(function(e){
      if(e.keyCode === 13) setNameInner();
    });
    $('#playerName').keyup(function(){
      localStorage.playerName = $(this).val();
    });
  },

  // 聊天功能
  chat: function(e){
    var that = this;
    function chat(){
      var msg = $('#sendMsg').val();
      if(msg === '') return;
      if(msg.match('#')) return;
      if(msg === '/clear'){
        $('.chatRoom' + that.whichRoom).empty();
        $('#sendMsg').val('');
        return;
      }
      if(!that.whichRoom){
        that.sendMsg('ROOMCHAT#' + msg);
        $('#sendMsg').val('');
        return;
      }
      that.sendMsg('SERVERCHAT#' + msg);
      $('#sendMsg').val('');
    }
    $('#sendMsgBtn').click(chat);
    $('#sendMsg').keypress(function(e){
      if(e.keyCode === 13) chat();
    });
  },

  // 随机进房间
  enterRoomByRand: function(e){
    var that = this;
    $('#joinRoomByRand').click(function(){
      that.audio('btnClick');
      that.sendMsg('JOIN#' + parseInt(Math.random() * 10000000).toString());
    });
  },

  // 进入房间
  enterRoom: function(e){
    var that = this;
    function enterRoomInner(){
      var num = $('#roomNumber').val();
      if(num === ''){
        $('#setRoomAlert').html('DALAO们就是喜欢去不存在的地方溜溜 ♪（´∀｀●）ﾉｼ');
        that.setErrorAnimate('#setRoomAlert');
        return;
      }
      if(num.length > 8){
        $('#setRoomAlert').html('太..太长了..这个不行');
        that.setErrorAnimate('#setRoomAlert');
        return;
      }
      for(var i = 0; i < num.length; i ++){
        if(!(num[i] >= '0' && num[i] <= 9)){
          $('#setRoomAlert').html('说好了只能是数字的');
          that.setErrorAnimate('#setRoomAlert');
          return;
        }
      }
      if(!that.isInRoom){
        that.audio('btnClick');
        $('#chatBody').empty();
        that.sendMsg('JOIN#' + num);
        that.chatFormat(['<span style="color: #f00;">系统提示</span>', '/clear可以清空框框'], 0);
        return;
      } 
      $('#setRoomAlert').html('你没干啥吧。。发生了奇怪的错误');
      that.setErrorAnimate('#setRoomAlert');
    }
    $('#setRoomNumber').click(enterRoomInner);
    $('#roomNumber').keypress(function(e){
      if(e.keyCode === 13) enterRoomInner();
    });
  },

  // 播放音频
  audio: function(type){
    var audio = new Audio(this.audioUrl[type]);
    audio.play();
    (function(obj){
      setTimeout(function(){
        delete obj;
      }, 5000);
    })(audio)
  },

  // 准备游戏
  ready: function(e){
    var that = this;
    $('#ready').click(function(){
      that.sendMsg('READY#' + $(this).val());
      if($(this).val() === '1'){
        $(this).html('取消准备');
        $(this).val('0');
        that.audio('ready');
        return;
      }
      $(this).html('准备');
      $(this).val('1');
      that.audio('unReady');
    });
  },

  // WebSocket初始化
  initWebSocket: function(e){
    this.socket = new WebSocket(this.url);
    this.socket.onopen = function(e){
      console.log('连接成功');
    }
  },

  // 发送广播包
  sendMsg: function(str){
    console.log('发送了:' + '>>' + str + '<<');
    this.socket.send('>>' + str + '<<');
  },

  // 接收包并处理
  getMsg: function(e){
    var that = this;
    this.socket.onmessage = function(e){
      console.log('收到了:' + e.data);
      var returnMsg = e.data.split('#');
      var type = returnMsg[0].replace('>>', '');
      returnMsg[returnMsg.length - 1] = returnMsg[returnMsg.length - 1].replace('<<', '');

      switch(type){
        case 'AGENTID':
          // 得到用户ID
          that.playerId = returnMsg[1];
          break;
        case 'ROOM':
          // 申请或者进入房间
          $('#judgeWarpper').addClass('animated bounceOut');
          setTimeout(function(){
            $('#judgeWarpper').removeClass('animated bounceOut');
            $('#judgeWarpper').css('display', 'none');        
          }, 1000);
          that.isPlaying = false;
          that.clear();
          $('#exitRoom').removeAttr('disabled');
          $('#quesTitle').html('题目 & 答案');
          clearInterval(that.timer);
          $('#ready').html('准备');
          $('#ready').removeAttr('disabled');
          $('#ready').val('1');
          $('.state').html('<span style="color: #f00">未准备</span>');
          that.roomId = returnMsg[1];
          that.isInRoom = true;
          $('#playersArea .title .exitRoomTitle').html('RID:' + that.roomId);
          $('#drawBoardWarpper').removeClass('animated bounceOut');
          $('#roomSelector').removeClass('animated bounceIn');
          $('#roomSelector').addClass('animated bounceOut');
          setTimeout(function(){
            $('#drawBoardWarpper').css('display', 'block');
            $('#drawBoardWarpper').css('z-index', '15');
            $('#drawBoardWarpper').addClass('animated bounceIn');
          }, 200);
          setTimeout(function(){
            $('#roomSelectorWarpper').css('display', 'none');
          }, 1000);
          break;

        case 'PLAYER':
          // 新玩家加入 状态更新
          var userInfo   = returnMsg[1].split('|');
          var flag       = 0;
          var user       = $('<div></div>');
          var left       = $('<div></div>');
          var right      = $('<div></div>');
          var playerName = $('<div></div>');
          var score      = $('<div></div>');
          var state      = $('<div></div>');

          if(that.isPlaying) return;
          if(that.playerList[userInfo[0]]){
            $('.' + 'score' + that.playerList[userInfo[0]].id).html(userInfo[3]);
            $('.' + 'state' + that.playerList[userInfo[0]].id).html(userInfo[4] === '0' ? '<span style="color: #f00">未准备</span>' : '<span style="color: #27ae60">准备</span>');
            return;
          }

          user.addClass('user user' + userInfo[0]);
          left.addClass('left');
          right.addClass('right');
          playerName.addClass('info playerName ' + 'id' + userInfo[0]);
          score.addClass('info ' + 'score' + userInfo[0]);
          state.addClass('info state ' + 'state' + userInfo[0]);

          var headImg = (userInfo[2].toUpperCase() === 'MICOYA' ? '<img src="./assets/images/micoya.jpg" alt="">' : '<img src="./assets/images/' + parseInt(Math.random() * 12 + 1) + '.png" alt="">');
          left.html(headImg);
          playerName.html(userInfo[2]);
          score.html(userInfo[3]);
          state.html(userInfo[4] === '0' ? '<span style="color: #f00">未准备</span>' : '<span style="color: #27ae60">准备</span>');
          right.append(playerName, score, state);
          user.append(left, right);
          that.playerList[userInfo[0]] = {id: userInfo[0], name: userInfo[2], score: userInfo[3], state: userInfo[4]};
          that.showTips(userInfo[2] + ' 进入了房间', 2000);
          that.chatFormat(['<span style="color: #f00;">系统提示</span>', userInfo[2] + ' 进入了房间', 0]);
          $('#drawBoardWarpper #drawBoard #playersArea').append(user);
          break;

        case 'ERROR':
          if(! that.isInRoom){
            if(returnMsg[1] === '房间已开始游戏，请稍后加入'){
              $('#setRoomAlert').html('有老板在里面谈笑风生');
              that.setErrorAnimate('#setRoomAlert');
              return;
            }
            $('#setRoomAlert').html('老板..里面6P..咳咳...6Player了');
            that.setErrorAnimate('#setRoomAlert');
          }
          break;

        case 'DRAW':
          var obj = JSON.parse(returnMsg[1]);
          if(obj.clear){
            that.clear();
            return; 
          }
          if(obj.painter === that.playerId) return;
          if(obj.firstPoint){
            that.cxt.beginPath();
            that.cxt.moveTo(obj.x, obj.y); 
          }
          that.cxt.lineWidth = obj.lineWidth;
          that.cxt.strokeStyle = '#' + obj.lineColor;
          that.cxt.lineTo(obj.x, obj.y);
          that.cxt.stroke();
          if(obj.state) that.cxt.closePath();
          break;
        
        case 'PAINT':
          that.clear();
          that.isPlaying = true;
          that.curPainter = returnMsg[1].toString();
          $('#ready').html('游戏中');
          $('.state').html('<span style="color: #27ae60">等待</span>');
          $('.state' + returnMsg[1].toString()).html('<span style="color: #f00">画画中</span>');
          if(that.playerId !== returnMsg[1].toString()){
            console.log('不是我画');
            $('#canvas').css('z-index', '-1');
            that.isMyTurn = false;
            break;
          }
          that.isMyTurn = true;
          that.showTips('轮到你画了', 2000);
          $('#canvas').css('z-index', $('#drawBoardWarpper').css('z-index'));
          break;

        case 'SETGAMESTATE':
          $('#judgeWarpper').addClass('animated bounceOut');
          setTimeout(function(){
            $('#judgeWarpper').removeClass('animated bounceOut');
            $('#judgeWarpper').css('display', 'none');        
          }, 1000);
          $('#taunt').removeAttr('disabled');
          $('#encourage').removeAttr('disabled');
          that.isAnswered = false;
          that.timerFlag = true;
          $('#exitRoom').attr('disabled', 'disabled');
          $('#ready').attr('disabled', 'disabled');
          $('#quesTitle').html('');
          var timerInfo = returnMsg[1].split('|');
          var count = parseInt(timerInfo[1]);
          that.timer = setInterval(function(){
            if(that.timerFlag && !(that.isAnswered) && count < 16){
              that.showTips('这一轮还有十五秒 抓紧时间！', 1500);
              that.chatFormat(['<span style="color: #f00;">系统提示</span>', '这一轮还有十五秒 抓紧时间！'], 0);
              that.audio('time15');
              that.timerFlag = false;
            }
            $('#clock').html(count);
            count --;
            if(count < 0) clearInterval(that.timer);
          }, 1000);
          that.showTips('新的一轮开始了', 1000);
          break;

        case 'TITLE':
          that.isMyTurn = true;
          $('#quesTitle').html(returnMsg[1]);
          break;

        case 'HINT':
          if(! that.isMyTurn){
            $('#quesTitle').html($('#quesTitle').html() + '&nbsp;' + returnMsg[1]);
          }
          break;

        case 'SCORE':
          var scorer = returnMsg[1].split('|');
          var num = parseInt($('.score' + scorer[0]).text()) + parseInt(scorer[1]);
          $('.score' + scorer[0]).html(num);
          if(that.isAnswered){
            that.chatFormat(['<span style="color: #f00;">系统提示</span>', '你已经回答对了！'], 0);
            return;
          }
          if(that.playerId === scorer[0]){
            that.audio('getScore');
            that.isAnswered = true;
            that.showTips(that.playerList[scorer[0]].name + '答对了!', 500);
          }
          if(that.curPainter === scorer[0]){
            that.chatFormat(['<span style="color: #f00;">系统提示</span>', that.playerList[that.curPainter].name + '加1分！'], 0);
            return;
          }
          that.chatFormat(['<span style="color: #f00;">系统提示</span>', that.playerList[scorer[0]].name + '答对了！'], 0);
          break;
        case 'ANSWER':
          $('#quesTitle').html('答案:' + returnMsg[1]);
          that.showTips('答案:' + returnMsg[1], 4000);
          break;

        case 'ROOMCHAT':
          if(that.whichRoom) $('#haveMsg0').css('display', 'inline');
          if(returnMsg[1].match('JUDGEEVENTDATA')){
            var judge = returnMsg[1].split('|');
            var namer = judge[0].split(':');
            if(judge[1] === 'encourage'){
              that.chatFormat(['<span style="color: #f00;">系统提示</span>', namer[0] + '对' + that.playerList[judge[2]].name + '发起了鼓励'], 0);
              that.audio('encourage');
              break;
            }
            that.chatFormat(['<span style="color: #f00;">系统提示</span>', namer[0] + '对' + that.playerList[judge[2]].name + '发起了嘲讽'], 0);
            that.audio('taunt');
            break;
          }
          if(returnMsg[1].split(':')[1].toUpperCase().match('NISAL') && !(that.isNisaling)){
            that.audio('nisal');
            that.isNisaling = true;
            setTimeout(function(){
              that.isNisaling = false;
            }, 3000);
          } 
          that.chatFormat(returnMsg[1].split(':'), 0);
          break;

        case 'PLAYEREXIT':
          that.showTips(that.playerList[returnMsg[1]].name + '退出了房间', 2000);
          $('.user' + returnMsg[1]).remove();
          delete that.playerList[returnMsg[1]];
          break;

        case 'TIMEEND':
          that.showTips('本轮结束！', 1000);
          clearInterval(that.timer);
          that.audio('timesOver');

          if(!that.isMyTurn){
            $('#judgeWarpper').css('display', 'block');
            $('#judgeWarpper').addClass('animated bounceIn');
            setTimeout(function(){
              $('#judgeWarpper').removeClass('animated bounceIn');
            }, 1000)
          }
          break;

        case 'SYSTEM':
          that.chatFormat(['<span style="color: #f00;">系统通知</span>', returnMsg[1]], 0);
          that.chatFormat(['<span style="color: #f00;">系统通知</span>', returnMsg[1]], 1);
          break;
        
        case 'SERVERCHAT':
          that.chatFormat(returnMsg[1].split(':'), 1);
          if(!that.whichRoom) $('#haveMsg1').css('display', 'inline');
          break;
      }
    }
  },

  // 格式化聊天框内容
  chatFormat: function(retInfo, target){
    var chatBlock   = $('<div></div>');
    var chatInfo    = $('<div></div>');
    var chatContent = $('<div></div>');
    var name        = $('<span></span>');
    var dateCon     = $('<span></span>');
    var dater       = new Date();
    var date        = '&nbsp;&nbsp;' + dater.getFullYear() + '/' + dater.getMonth() + '/' + dater.getDate() + '&nbsp;' + dater.getHours() + ':' + dater.getMinutes() + ':' + dater.getSeconds();
    
    chatBlock.addClass('chatBlock');
    chatInfo.addClass('chatInfo');
    chatContent.addClass('chatContent');
    name.addClass('name');
    dateCon.addClass('date');

    name.html(retInfo[0]);
    dateCon.html(date);
    chatContent.html(retInfo[1]);

    chatInfo.append(name, date);
    chatBlock.append(chatInfo, chatContent);
    $('.chatRoom' + target).append(chatBlock);
    $('#chatBody').animate({scrollTop: $('#chatBody')[0].scrollHeight}, 200);
    $('#chatBodyCommen').animate({scrollTop: $('#chatBodyCommen')[0].scrollHeight}, 200);
  },

  // 初始化调用
  init: function(){
    this.setMouseDownEvent();
    this.mobileSupport();
    this.clearEve();
    this.setLineColor();
    this.initWebSocket();
    this.getMsg();
    this.setLineWidth();
    this.setName();
    this.enterRoom();
    this.enterRoomByRand();
    this.ready();
    this.chat();
    this.exitTheRoom();
    this.initTipsColor();
    this.encourage();
    this.taunt();
    this.initAudio();
    this.swChatRoom();
  },

  // 设置线条颜色
  setLineColor: function(e){
    var that = this;
    $('.paint').click(function(){
      $('.paint').removeClass('btnActive');
      $(this).val() === '#fff' ? that.canvas.style.cursor = 'url(./assets/images/earserCursor.png), default' : that.canvas.style.cursor = 'url(./assets/images/mouse.png), default';
      that.lineColor = $(this).val();
      $(this).addClass('btnActive');
    });
  },

  // 清空画布
  clearEve: function(e){
    var that = this;
    $('#clear').click(function(){
      that.sendMsg('DRAW#' + JSON.stringify({clear: true}));      
      that.clear();
    });
  },

  // 初始化配置
  setConfig: function(obj){
    this.canvas        = $('#canvas')[0];
    this.cxt           = this.canvas.getContext("2d");
    this.canvas.width  = 800;
    this.canvas.height = 600;
    this.cxt.lineCap   = 'round';
    this.cxt.lineWidth = 7;
    $('#playerName').focus();
    $('#setNamePanel').addClass('animated bounceIn');
    if(localStorage.playerName) $('#playerName').val(localStorage.playerName);
    this.chatFormat(['<span style="color: #f00;">系统提示</span>', '/clear可以清空框框'], 1);
  },

  // 画笔
  setMouseDownEvent: function(e){
    var that = this;
    // 绑定鼠标按下事件
    $('#canvas').on('mousedown', function(e){
      that.cxt.beginPath();
      that.cxt.moveTo(e.pageX - $('#canvas').offset().left , e.pageY - $('#canvas').offset().top);
      that.sendMsg('DRAW#' + JSON.stringify({x: e.pageX - $('#canvas').offset().left , y: e.pageY - $('#canvas').offset().top, painter: that.playerId, firstPoint: true, lineColor: that.lineColor.replace('#', ""), lineWidth: that.lineWidth}));
      that.drawData[that.drawDataCount] = [];
      that.drawData[that.drawDataCount].push({x: e.pageX - $('#canvas').offset().left, y: e.pageY - $('#canvas').offset().top});
      // 绑定鼠标移动事件
      $('#canvas').on('mousemove', function(e){
        that.cxt.lineTo(e.pageX - $('#canvas').offset().left ,e.pageY - $('#canvas').offset().top);
        that.sendMsg('DRAW#' + JSON.stringify({x: e.pageX - $('#canvas').offset().left , y: e.pageY - $('#canvas').offset().top, painter: that.playerId, lineColor: that.lineColor.replace('#', ""), lineWidth: that.lineWidth}));
        that.drawData[that.drawDataCount].push({x: e.pageX - $('#canvas').offset().left, y: e.pageY - $('#canvas').offset().top});
        that.cxt.lineWidth = that.lineWidth;
        that.cxt.strokeStyle = that.lineColor;
        that.cxt.stroke();
      });
      // 绑定鼠标弹起事件
      $('#canvas').on('mouseup', function(e){
        that.cxt.closePath();
        that.drawDataCount ++;
        that.sendMsg('DRAW#' + JSON.stringify({x: e.pageX - $('#canvas').offset().left , y: e.pageY - $('#canvas').offset().top, state: true, painter: that.playerId, lineColor: that.lineColor.replace('#', ""), lineWidth: that.lineWidth}));
        $('#log').html(that.drawDataCount);
        $('#canvas').off('mousemove');
        $('#canvas').off('mouseup');
      });
    });
  },

  // 移动端支持
  mobileSupport: function(){
    var that = this;
    function ontouchstart(e){
      alert(1);
      e.preventDefault();
      that.cxt.beginPath();
      that.cxt.moveTo(e.touches[0].pageX - $('#canvas').offset().left , e.touches[0].pageY - $('#canvas').offset().top);
      that.sendMsg('DRAW#' + JSON.stringify({x: e.touches[0].pageX - $('#canvas').offset().left , y: e.touches[0].pageY - $('#canvas').offset().top, painter: that.playerId, firstPoint: true, lineColor: that.lineColor.replace('#', ""), lineWidth: that.lineWidth}));
      that.drawData[that.drawDataCount] = [];
      that.drawData[that.drawDataCount].push({x: e.touches[0].pageX - $('#canvas').offset().left, y: e.touches[0].pageY - $('#canvas').offset().top});
      document.getElementById('canvas').addEventListener('touchmove', ontouchmove, false);
      return 1;
    }
    function ontouchmove(e){
      e.preventDefault();
      that.cxt.lineTo(e.touches[0].pageX - $('#canvas').offset().left ,e.touches[0].pageY - $('#canvas').offset().top);
      that.sendMsg('DRAW#' + JSON.stringify({x: e.touches[0].pageX - $('#canvas').offset().left , y: e.touches[0].pageY - $('#canvas').offset().top, painter: that.playerId, lineColor: that.lineColor.replace('#', ""), lineWidth: that.lineWidth}));
      that.drawData[that.drawDataCount].push({x: e.touches[0].pageX - $('#canvas').offset().left, y: e.touches[0].pageY - $('#canvas').offset().top});
      that.cxt.lineWidth = that.lineWidth;
      that.cxt.strokeStyle = that.lineColor;
      that.cxt.stroke();
      document.getElementById('canvas').addEventListener('touchend', ontouchend, false);
    }
    function ontouchend(e){
      e.preventDefault();
      that.cxt.closePath();
      that.drawDataCount ++;
      that.sendMsg('DRAW#' + JSON.stringify({x: e.pageX - $('#canvas').offset().left , y: e.pageY - $('#canvas').offset().top, state: true, painter: that.playerId, lineColor: that.lineColor.replace('#', ""), lineWidth: that.lineWidth}));
      $('#log').html(that.drawDataCount);
      document.getElementById('canvas').removeEventListener('touchmove', fingerMove, false);
      document.getElementById('canvas').removeEventListener('touchend', fingerLeft, false);
    }
    alert(1);
    alert(ontouchstart());
    $('#canvas').on('touchstart', ontouchstart);
  },

  clear: function(e){
    this.cxt.fillStyle="#000000";  
    this.cxt.beginPath(); 
    this.cxt.clearRect(0, 0, canvas.width, canvas.height); 
    this.cxt.closePath();
  }
}

doodle.setConfig();
doodle.init();
