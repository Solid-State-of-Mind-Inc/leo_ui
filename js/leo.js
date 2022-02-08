var twist;
var manager;
var ros;
var batterySub;
var odomSub;
var nwSub;
var cmdVelPub;
var twistIntervalID;
var robot_hostname;

var max_linear_speed = 0.5;
var max_angular_speed = 1.2;

var gamepads = navigator.getGamepads();
console.log(gamepads);

function initROS() {

    ros = new ROSLIB.Ros({
        url: "ws://" + robot_hostname + ":9090"
    });

    relay1Pub = new ROSLIB.Topic({
        ros: ros,
        name: '/relay1',
        messageType: 'std_msgs/Bool',
        queue_size: 5
    });

    relay2Pub = new ROSLIB.Topic({
        ros: ros,
        name: '/relay2',
        messageType: 'std_msgs/Bool',
        queue_size: 5
    });
    relay1Pub.advertise();
    relay2Pub.advertise();

    // Init message with zero values.
    twist = new ROSLIB.Message({
        linear: {                                                                   
            x: 0,
            y: 0,
            z: 0
        },
        angular: {
            x: 0,
            y: 0,
            z: 0
        }
    });

    cmdVelPub = new ROSLIB.Topic({
        ros: ros,
        name: 'cmd_vel',
        messageType: 'geometry_msgs/Twist',
        queue_size: 10
    });
    cmdVelPub.advertise();

    systemRebootPub = new ROSLIB.Topic({
        ros: ros,
        name: 'system/reboot',
        messageType: 'std_msgs/Empty'
    });
    systemRebootPub.advertise();

    systemShutdownPub = new ROSLIB.Topic({
        ros: ros,
        name: 'system/shutdown',
        messageType: 'std_msgs/Empty'
    });
    systemShutdownPub.advertise();

    batterySub = new ROSLIB.Topic({
        ros : ros,
        name : 'battery',
        messageType : 'std_msgs/Float32',
        queue_length: 1
    });
    batterySub.subscribe(batteryCallback);

    odomSub = new ROSLIB.Topic({
        ros : ros,
        name : 'wheel_odom',
        messageType : 'geometry_msgs/TwistStamped',
        queue_length: 1
    });
    odomSub.subscribe(odomCallback);

}

function createJoystick() {

    joystickContainer = document.getElementById('joystick');

    manager = nipplejs.create({
        zone: joystickContainer,
        position: { left: 75 + '%', top: 50 + '%' },
        mode: 'static',
        size: 200,
        color: '#ffffff',
        restJoystick: true
    });

    manager.on('move', function (evt, nipple) {

        var lin = Math.sin(nipple.angle.radian) * nipple.distance * 0.01;
        var ang = -Math.cos(nipple.angle.radian) * nipple.distance * 0.01;

        twist.linear.x = lin * max_linear_speed;
        twist.angular.z = ang * max_angular_speed;
    });

    manager.on('end', function () {
        twist.linear.x = 0
        twist.angular.z = 0
    });
}

function initTeleopKeyboard() {
    var body = document.getElementsByTagName('body')[0];
    body.addEventListener('keydown', function(e) {
        switch(e.keyCode) {
            case 37: //left
                twist.angular.z = max_angular_speed;
                break;
            case 39: //right
                twist.angular.z = -max_angular_speed;
                break;
            case 38: ///up
                twist.linear.x = max_linear_speed;
                break;
            case 40: //down
                twist.linear.x = -max_linear_speed;
        }
    });
    body.addEventListener('keyup', function(e) {
        switch(e.keyCode) {
            case 37: //left
            case 39: //right
                twist.angular.z = 0;
                break;
            case 38: ///up
            case 40: //down
                twist.linear.x = 0;
        }
    });
}

function batteryCallback(message) {
    document.getElementById('batteryID').innerHTML = 'Voltage: ' + message.data.toFixed(2) + ' V';
}

function odomCallback(message) {
    document.getElementById('actualSpeed').innerHTML = 'Speed: ' + (message.twist.linear.x * 3.6).toFixed(2) + ' km/h';
}

function publishTwist() {
    cmdVelPub.publish(twist);
}

function switchLights(){
    var relayMsg;
    var checkBox = document.getElementById("lights-checkbox");

    if (checkBox.checked == true){
       relayMsg = new ROSLIB.Message({
            data: true
        });
    }
    else {
        relayMsg = new ROSLIB.Message({
            data: false
        });
    }
    relay1Pub.publish(relayMsg);
    relay2Pub.publish(relayMsg);
    
}

function systemReboot(){
    systemRebootPub.publish()
}

function turnOff(){
    systemShutdownPub.publish()
}

window.onblur = function(){  
    twist.linear.x = 0;
    twist.angular.z = 0;
    publishTwist();             
  }  

function shutdown() {
    clearInterval(twistIntervalID);
    relay1Pub.unadvertise();
    relay2Pub.unadvertise();
    cmdVelPub.unadvertise();
    systemRebootPub.unadvertise();
    systemShutdownPub.unadvertise();
    batterySub.unsubscribe();
    odomSub.unsubscribe();
    ros.close();
}

window.onload = function () {

    robot_hostname = location.hostname;

    initROS();
    initTeleopKeyboard();
    createJoystick();

    video = document.getElementById('video');
    video.src = "http://" + robot_hostname + ":8080/stream?topic=/camera/image_raw&type=ros_compressed";
    
    twistIntervalID = setInterval(() => publishTwist(), 100); // 10 hz

    window.addEventListener("beforeunload", () => shutdown());

    window.addEventListener("gamepadconnected", (event) => {
        console.log("A gamepad connected:");
        console.log(event.gamepad);
      });
      
      window.addEventListener("gamepaddisconnected", (event) => {
        console.log("A gamepad disconnected:");
        console.log(event.gamepad);
      });
}


