var http      = require('http');
var express    = require('express');
var bodyParser = require('body-parser');
var mysql      = require('mysql');
var urlencodedParser =  bodyParser.urlencoded({ extended: false });
var app = express();
var dateFormat = require('dateformat');
var nodemailer = require('nodemailer');
var cookieParser = require('cookie-parser');
var session = require('express-session');
var fs = require('fs');
var multer = require('multer');
var storage = multer.diskStorage({
	destination: function(req, file, cb){
		var dir = './uploads/';
		if (!fs.existsSync(dir)){
			fs.mkdirSync(dir);
		}
		cb(null,'uploads/');
	},
	filename: function(req, file, cb){
		cb(null, file.originalname);
	}
});
var upload = multer({storage:storage});


var conn = mysql.createConnection({
  host     : 'localhost',
  user     : 'root',
  database : 'censms'
});

var transporter = nodemailer.createTransport({
	service: 'gmail',
	auth: {
		user: 'mazin.alikarar@gmail.com',
		pass: ''
	}
});
											
conn.connect(function(err){
	if(!err) 
	{
		console.log("Database is connected :)");    
	} 
	else 
	{
		console.log("Error connecting database :(");    
	}
});
	
app.use(cookieParser());
app.use(session({
	secret: "This_is_a_secret",
	resave: false,
	saveUninitialized: true,
	maxAge: Date.now() + (30 * 86400 * 1000) //milliseconds
}));

//=================================================================

app.post('/auth',urlencodedParser,function (req, res) {
	
	//res.header("Access-Control-Allow-Origin", "*");
	//res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");

	conn.query('SELECT * FROM users WHERE user_name="'+req.body.username+'" AND user_pass="'+req.body.password+'"',function(err,res1){
		if(err) {
			console.log("Error!");
			res.send('-2');
		}
		else{
			if(res1.length==0) {
				console.log("No matching!");
				res.send('-2');
			}
			else if(res1.length==1){
				user_session = req.session;
				user_session.username = req.body.username;
				console.log("Successful login");
				res.send('1');
			}
		}
	});
});

app.post('/privilage',urlencodedParser,function (req, res) {

	if(user_session.username==""){
		console.log("Error");
		res.send('-2');
	}
	else {
		conn.query('SELECT * FROM users WHERE user_name="'+user_session.username+'"',function(err,res1){
			if(err) {
				console.log("Error");
				res.send('-2');
			}
			else{
				console.log("Privilage query");
				res.setHeader('Content-Type', 'application/json');
				res.send(JSON.stringify(res1));
			}
		});
	}
});

//=================================================================
app.post('/autocomplete_op',urlencodedParser,function(req,res){
	
	//This is needed if only "CORS" access is not enabled in the browser
	//res.header("Access-Control-Allow-Origin", "*");
	//res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
	
	conn.query('SELECT * FROM software WHERE name LIKE \'%'+req.body.sw_name+'%\'', function(err1,res1){
		if(err1){
			console.log("Error 1");
			res.send('-2');
		}
		else{
			var Pur_and_nPur_sw_ids = [];
			for(var i = 0 ; i<res1.length ; i++)
				if(res1[i].id!='')
					Pur_and_nPur_sw_ids.push(res1[i].id);
			if(Pur_and_nPur_sw_ids=="") Pur_and_nPur_sw_ids.push(9999999999);
			
			conn.query('SELECT * FROM sw_operations WHERE sw_id IN (' + Pur_and_nPur_sw_ids + ')' ,function(err2,res2){
				if(err2){
					console.log("Error 2");
					res.send('-2');
				}
				else{
					var Pur_sw_ids = [];
					for(var i = 0 ; i<res2.length ; i++)
						if(res2[i].sw_id!='')
							Pur_sw_ids.push(res2[i].sw_id);
					if(Pur_sw_ids=="") Pur_sw_ids.push(9999999999);
					
					conn.query('SELECT * FROM software WHERE id IN (' + Pur_sw_ids + ')' ,function(err3,res3){
						if(err3){
							console.log("Error 3");
							res.send('-2');
						}
						else{
							var data = [];
							for(var i = 0 ; i<res3.length ; i++)
								if(res3[i].name!='')
									data.push(res3[i].name);
							res.send(JSON.stringify(data));	
							console.log("Autocomplete");
						}
					});
				}
			});
		}
	});
});

app.post('/search_purchase_op',urlencodedParser,function(req,res){
	
	//This is needed if only "CORS" access is not enabled in the browser
	//res.header("Access-Control-Allow-Origin", "*");
	//res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
	
	conn.query('SELECT * FROM software WHERE name=\'' + req.body.sw_name + '\'' ,function(err1,res1){
		if(err1){
			console.log("Error 1");
			res.send('-2');
		}
		else{
			if(res1==""){
				console.log("Not registered in software table");
				res.send('0');
			}
			else{
				var sw_id = res1[0].id;
				
				conn.query('SELECT * FROM sw_operations WHERE sw_id=' + sw_id ,function(err2,res2){
					if(err2){
						console.log("Error 2");
						res.send('-2');
					}
					else{
						if(res2==""){
							console.log("Not registered in operations table");
							res.send('-1');
						}
						else{
							res2[0].sw_id = req.body.sw_name;
							res2[0].order_date 	 = obj_to_date(res2[0].order_date);
							res2[0].rec_date	 = obj_to_date(res2[0].rec_date);
							res2[0].lic_str_date = obj_to_date(res2[0].lic_str_date);
							res2[0].lic_exp_date = obj_to_date(res2[0].lic_exp_date);
						
							console.log("Successful Search");
							res.setHeader('Content-Type', 'application/json');
							res.send(JSON.stringify(res2));
						}
					}
				});
			}
		}
	});
});

app.post('/purchase_op',urlencodedParser,function(req,res){
	
	//This is needed if only "CORS" access is not enabled in the browser	
	//res.header("Access-Control-Allow-Origin", "*");
	//res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
	
	conn.query('SELECT * FROM software WHERE name=\'' + req.body.sw_name + '\'' ,function(err1,res1){
		if(err1){
			console.log("Error 1");
			res.send('-2');
		}
		else{
			if(res1==""){
				console.log("Not registered in software table");
				res.send('0');
			}
			else{
				var sw_id = res1[0].id;
				
				conn.query('SELECT * FROM sw_operations WHERE sw_id=' + sw_id ,function(err2,res2){
					if(err2){
						console.log("Error 2");
						res.send('-2');
					}
					else{
						if(res2!=""){
							console.log("Already purchased");
							res.send('-1');
						}
						else{
							var order_date 	 = format_date(req.body.order_date); 
							var rec_date 	 = format_date(req.body.rec_date);
							var lic_str_date = format_date(req.body.lic_str_date);
							var lic_exp_date = format_date(req.body.lic_exp_date);
						
							conn.query('INSERT INTO sw_operations (sw_id,  R_num, P_num, amount, new_sw, order_date, received, rec_date, lic_str_date, lic_exp_date, op_comments) VALUES (' + sw_id +',\''+req.body.R_num+'\',\''+req.body.P_num+'\',\''+req.body.amount+'\',\''+req.body.new_sw+'\',\''+order_date+'\',\''+req.body.received+'\',\''+rec_date+'\',\''+lic_str_date+'\',\''+lic_exp_date+'\',\''+req.body.comments+'\')' ,function(err3){
								if(err3) {
									console.log("Error 3");
									res.send('-2');
								}
								else {
									conn.query('UPDATE sw_operations SET time_stamp=NOW() WHERE sw_id=' + sw_id ,function(err4){
										if(err4) {
											console.log("Error 4");
											res.send('-2');
										}
										else {
											conn.query('SELECT * FROM variables WHERE row=0' ,function(err5,res5){
												if(err5) {
													console.log("Error 5");
													res.send('-2');
												}
												else {
													if(req.body.purch_email=='true'){
														
														var purch_auto_email = res5[0].purch_auto_email.replace(/%20/g, " ").replace(/%SW_NAME%/g, res1[0].name).replace(/%R_NUM%/g, req.body.R_num).replace(/%P_NUM%/g, req.body.P_num).replace(/%AMOUNT%/g, req.body.amount).replace(/%ASSOC_DEAN%/g, res5[0].a_dean_name).replace(/%A_ASSIS%/g, res5[0].ad_assis_name); 
									
														var mailOptions = {
															from: 'Mazin AliKarar <mazin.alikarar@gmail.com>',
															to: res5[0].a_dean_email+";"+res5[0].ad_assis_email,
															subject: 'Software Purchase',
															text: purch_auto_email
														};
														
														transporter.sendMail(mailOptions, function(error, info){
															if(error){
																console.log(error);
																res.send('-2');
															}
															else{
																console.log("Successful Purchase");
																console.log("Purchase Mail");
																res.send('1');
															}
														});	
													}
													else{
														console.log("Successful Purchase");
														res.send('1');
													}
												}
												
											});
										}
									});
								}
							});
						}
					}
				});
			}
		}
	});

});

app.post('/renew_op',urlencodedParser,function(req,res){
	
	conn.query('SELECT * FROM software WHERE name=\'' + req.body.sw_name + '\'' ,function(err1,res1){
		if(err1){
			console.log("Error 1");
			res.send('-2');
		}
		else{
			if(res1==""){
				console.log("Not registered in software table");
				res.send('0');
			}
			else{
				var sw_id = res1[0].id;
				
				conn.query('SELECT * FROM sw_operations WHERE sw_id=' + sw_id ,function(err2,res2){
					if(err2){
						console.log("Error 2");
						res.send('-2');
					}
					else{
						if(res2==""){
							console.log("No Match in operations table");
							res.send('-1');
						}
						else{
							var order_date 	 = format_date(req.body.order_date); 
							var rec_date 	 = format_date(req.body.rec_date);
							var lic_str_date = format_date(req.body.lic_str_date);
							var lic_exp_date = format_date(req.body.lic_exp_date);
							
							conn.query('UPDATE sw_operations SET R_num=\''+req.body.R_num+'\',P_num=\''+req.body.P_num+'\',amount=\''+req.body.amount+'\',new_sw=\''+req.body.new_sw+'\',order_date=\''+order_date+'\',received=\''+req.body.received+'\',rec_date=\''+rec_date+'\',lic_str_date=\''+lic_str_date+'\',lic_exp_date=\''+lic_exp_date+'\',op_comments=\''+req.body.comments+'\', time_stamp=NOW() WHERE sw_id=' + sw_id ,function(err3){
								if(err3) {
									console.log("Error 3");
									res.send('-2');
								}
								else {
									conn.query('UPDATE sw_operations SET time_stamp=NOW() WHERE sw_id=' + sw_id ,function(err4){
										if(err4) {
											console.log("Error 4");
											res.send('-2');
										}
										else {
											conn.query('SELECT * FROM variables WHERE row=0' ,function(err5,res5){
												if(err5) {
													console.log("Error 5");
													res.send('-2');
												}
												else {
													if(req.body.renew_email=='true'){
														
														var renew_auto_email = res5[0].renew_auto_email.replace(/%20/g, " ").replace(/%SW_NAME%/g, res1[0].name).replace(/%R_NUM%/g, req.body.R_num).replace(/%P_NUM%/g, req.body.P_num).replace(/%AMOUNT%/g, req.body.amount).replace(/%ASSOC_DEAN%/g, res5[0].a_dean_name).replace(/%A_ASSIS%/g, res5[0].ad_assis_name); 
									
														var mailOptions = {
															from: 'Mazin AliKarar <mazin.alikarar@gmail.com>',
															to: res5[0].a_dean_email+";"+res5[0].ad_assis_email,
															subject: 'Software Renewal',
															text: renew_auto_email
														};
														
														transporter.sendMail(mailOptions, function(error, info){
															if(error){
																console.log(error);
																res.send('-2');
															}
															else{
																console.log("Successful Update");
																console.log("Renewal Mail");
																res.send('1');
															}
														});	
													}
													else{
														console.log("Successful Update");
														res.send('1');
													}
												}
											});
										}
									});
								}
							});
						}
					}
				});
			}
		}
	});

});

app.post('/upd_purchase_op',urlencodedParser,function(req,res){
	
	conn.query('SELECT * FROM software WHERE name=\'' + req.body.sw_name + '\'' ,function(err1,res1){
		if(err1){
			console.log("Error 1");
			res.send('-2');
		}
		else{
			if(res1==""){
				console.log("Not registered in software table");
				res.send('0');
			}
			else{
				var sw_id = res1[0].id;
				
				conn.query('SELECT * FROM sw_operations WHERE sw_id=' + sw_id ,function(err2,res2){
					if(err2){
						console.log("Error 2");
						res.send('-2');
					}
					else{
						if(res2==""){
							console.log("No Match in operations table");
							res.send('-1');
						}
						else{
							var order_date 	 = format_date(req.body.order_date); 
							var rec_date 	 = format_date(req.body.rec_date);
							var lic_str_date = format_date(req.body.lic_str_date);
							var lic_exp_date = format_date(req.body.lic_exp_date);
							
							conn.query('UPDATE sw_operations SET R_num=\''+req.body.R_num+'\',P_num=\''+req.body.P_num+'\',amount=\''+req.body.amount+'\',new_sw=\''+req.body.new_sw+'\',order_date=\''+order_date+'\',received=\''+req.body.received+'\',rec_date=\''+rec_date+'\',lic_str_date=\''+lic_str_date+'\',lic_exp_date=\''+lic_exp_date+'\',op_comments=\''+req.body.comments+'\', time_stamp=NOW() WHERE sw_id=' + sw_id ,function(err3){
								if(err3) {
									console.log("Error 3");
									res.send('-2');
								}
								else {
									conn.query('UPDATE sw_operations SET time_stamp=NOW() WHERE sw_id=' + sw_id ,function(err4){
										if(err4) {
											console.log("Error 4");
											res.send('-2');
										}
										else {
											conn.query('SELECT * FROM variables WHERE row=0' ,function(err5,res5){
												if(err5) {
													console.log("Error 5");
													res.send('-2');
												}
												else {
													if(req.body.dlv_email=='true'){
														
														var deliv_auto_email = res5[0].deliv_auto_email.replace(/%20/g, " ").replace(/%SW_NAME%/g, res1[0].name).replace(/%R_NUM%/g, req.body.R_num).replace(/%P_NUM%/g, req.body.P_num).replace(/%AMOUNT%/g, req.body.amount).replace(/%ASSOC_DEAN%/g, res5[0].a_dean_name).replace(/%A_ASSIS%/g, res5[0].ad_assis_name); 
									
														var mailOptions = {
															from: 'Mazin AliKarar <mazin.alikarar@gmail.com>',
															to: res5[0].rec_email,
															subject: 'Software Delivery',
															text: deliv_auto_email
														};
														
														transporter.sendMail(mailOptions, function(error, info){
															if(error){
																console.log(error);
																res.send('-2');
															}
															else{
																console.log("Successful Update");
																console.log("Delivery Mail");
																res.send('1');
															}
														});	
													}
													else{
														console.log("Successful Update");
														res.send('1');
													}
												}
											});
										}
									});
								}
							});
						}
					}
				});
			}
		}
	});

});

app.post('/del_purchase_op',urlencodedParser,function(req,res){
	
	//This is needed if only "CORS" access is not enabled in the browser
	//res.header("Access-Control-Allow-Origin", "*");
	//res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
	
	conn.query('SELECT * FROM software WHERE name=\'' + req.body.sw_name + '\'' ,function(err1,res1){
		if(err1){
			console.log("Error 1");
			res.send('-2');
		}
		else{
			if(res1==""){
				console.log("Not registered in software table");
				res.send('0');
			}
			else{
				var sw_id = res1[0].id;
				
				conn.query('SELECT * FROM sw_operations WHERE sw_id=' + sw_id ,function(err2,res2){
					if(err2){
						console.log("Error 2");
						res.send('-2');
					}
					else{
						if(res2==""){
							console.log("Not registered in operations table");
							res.send('-1');
						}
						else{
							conn.query('DELETE FROM sw_operations WHERE sw_id=' + sw_id ,function(err3){
								if(err3) {
									console.log("Error 3");
									res.send('-2');
								}
								else {
									console.log("Successful Delete");
									res.send('1');
								}
							});
						}
					}
				});
			}
		}
	});
});

//curl -l http://localhost:8081/truncate_sw_operations
app.get('/truncate_sw_operations',urlencodedParser,function(req,res){
	conn.query('TRUNCATE TABLE sw_operations' ,function(err){
		if(err) {
			console.log("Error");
		}
		else {
			console.log("sw_operations table is reset");
			res.send('1');
		}
	});
});

var format_date = function(n_date) {
	var day, month, year;
	var res = n_date.split("/");
	var date = res[2] +'-'+ res[0] +'-'+ res[1];  //year, month, day
	return date;
};

var obj_to_date = function(obj) {
	
	var str_obj = String(obj);
	if(str_obj=="0000-00-00")  {return "0";}
	var res = str_obj.split(" ");
	
	switch(res[1]) {
		case 'Jan':
			res[1] = '01';
			break;
		case 'Feb':
			res[1] = '02';
			break;
		case 'Mar':
			res[1] = '03';
			break;
		case 'Apr':
			res[1] = '04';
			break;
		case 'May':
			res[1] = '05';
			break;
		case 'Jun':
			res[1] = '06';
			break;
		case 'Jul':
			res[1] = '07';
			break;
		case 'Aug':
			res[1] = '08';
			break;
		case 'Sep':
			res[1] = '09';
			break;
		case 'Oct':
			res[1] = '10';
			break;
		case 'Nov':
			res[1] = '11';
			break;
		case 'Dec':
			res[1] = '12';
			break;
	}
	
	var date = res[1]+"/"+res[2]+"/"+res[3];
	
	return date;
}

app.post('/send_auto_email',urlencodedParser,function(req,res){
	
	var transporter = nodemailer.createTransport({
		service: 'Gmail',
		auth: {
			user: 'mazin.alikarar@gmail.com',
			pass: 'electeng'
		}
	});
	
	var mailOptions = {
		from: 'Mazin AliKarar <mazin.alikarar@gmail.com>',
		to: 'b00066350@aus.edu',
		subject: 'Auto Email',
		html: '<p>You got a new submission with the following details..</p><ul><li>Name: '+ req.body.name +'</li><li>Email: '+req.body.email+'</li></ul>'
	};
	
	transporter.sendMail(mailOptions, function(error, info){
		if(error){
			console.log(error);
			res.send('-2');
		}
		else{
			console.log("Email is Sent");
			res.send('1');
		}
	});	
});

//=================================================================

app.post('/autocomplete_sw',urlencodedParser,function(req,res){
	conn.query('SELECT name FROM software WHERE name LIKE \'%'+req.body.sw_name+'%\'',function(err,res1){
		if(err) {
			console.log("Error");
			res.send('-2');
		}
		else{
			var data = [];
			for(var i = 0 ; i<res1.length ; i++)
				if(res1[i].name!='')
					data.push(res1[i].name);
			res.send(JSON.stringify(data));	
			console.log("Autocomplete");
		}
	});
});

app.post('/search_sw',urlencodedParser,function(req,res){
	
	//res.header("Access-Control-Allow-Origin", "*");
	//res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");

	conn.query('SELECT * FROM software WHERE name=\'' + req.body.sw_name + '\'' ,function(err1,res1){
		if(err1) {
			console.log("Error 1");
			res.send('-2');
		}
		else {
			if(res1==""){
				console.log("No Match");
				res.send('0');
			}
			else{
				//No Fac, No Vend
				if((res1[0].fac_id=="")&&(res1[0].vend_id=="")){
					console.log("Successful Search");
					res.setHeader('Content-Type', 'application/json');
					res.send(JSON.stringify(res1));
				}
				//No Fac, Vend
				else if((res1[0].fac_id=="")&&(res1[0].vend_id!="")){
					conn.query('SELECT name FROM vendors WHERE id=\'' + res1[0].vend_id + '\'' ,function(err2,res2){
						if(err2) {
							console.log("Error 2");
							res.send('-2');
						}
						else {
								res1[0].vend_id = res2[0].name;
								console.log("Successful Search");
								res.setHeader('Content-Type', 'application/json');
								res.send(JSON.stringify(res1));
						}
					});
				}
				//Fac, No Vend
				else if((res1[0].fac_id!="")&&(res1[0].vend_id=="")){
					conn.query('SELECT name FROM fac_staff WHERE id=\'' + res1[0].fac_id + '\'' ,function(err3,res3){
						if(err3) {
							console.log("Error 3");
							res.send('-2');
						}
						else {
							res1[0].fac_id = res3[0].name;
							console.log("Successful Search");
							res.setHeader('Content-Type', 'application/json');
							res.send(JSON.stringify(res1));
						}
					});
				}
				// Fac, Vend
				else if((res1[0].fac_id!="")&&(res1[0].vend_id!="")){
					conn.query('SELECT name FROM fac_staff WHERE id=\'' + res1[0].fac_id + '\'' ,function(err4,res4){
						if(err4) {
							console.log("Error 4");
							res.send('-2');
						}
						else {
							res1[0].fac_id = res4[0].name;
							conn.query('SELECT name FROM vendors WHERE id=\'' + res1[0].vend_id + '\'' ,function(err5,res5){
								if(err5) {
									console.log("Error 5");
									res.send('-2');
								}
								else {
										res1[0].vend_id = res5[0].name;
										console.log("Successful Search");
										res.setHeader('Content-Type', 'application/json');
										res.send(JSON.stringify(res1));
								}
							});
						}
					});
				}
			}
		}
	});
});

app.post('/reg_sw',urlencodedParser,function(req,res){
	
	//res.header("Access-Control-Allow-Origin", "*");
	//res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
	
	conn.query('SELECT * FROM software WHERE name=\'' + req.body.sw_name + '\'' ,function(err1,res1){
		if(err1){
			console.log("Error 1");
			res.send('-2');
		}
		else{
			if(res1!=""){
				console.log("Already Registered");
				res.send('-1');
			}
			else{
				//No Fac, No Vend
				if((req.body.fac_name=="")&&(req.body.vend_name=="")){
					conn.query('INSERT INTO software (name, version, products, lic_type, lic_server_port, num_lic, fac_id, vend_id, files, comments) VALUES ( \'' + req.body.sw_name + '\',\'' + req.body.version + '\',\'' + req.body.products + '\',\'' + req.body.lic_type + '\',\'' + req.body.lic_server_port + '\',\'' + req.body.num_lic + '\',\'' + req.body.fac_name + '\',\'' + req.body.vend_name + '\',\'' + req.body.files + '\',\'' + req.body.sw_comments +  '\')' ,function(err11){
						if(err11) {
							console.log("Error 11");
							res.send('-2');
						}
						else {
							conn.query('UPDATE software SET time_stamp=NOW() WHERE name=\'' + req.body.sw_name + '\'',function(err12){
								if(err12) {
									console.log("Error 12");
									res.send('-2');
								}
								else {
									console.log("Successful Register");
									res.send('1');
								}
							});
						}
					});
				}
				//No Fac, Vend
				else if((req.body.fac_name=="")&&(req.body.vend_name!="")){
					conn.query('SELECT id FROM vendors WHERE name=\'' + req.body.vend_name + '\'' ,function(err21,res21){
						if(err21) {
							console.log("Error 21");
							res.send('-2');
						}
						else {
							if(res21==""){
								console.log("No Such Vendor");
								res.send('-4');
							}
							else{
								var vend_id = res21[0].id;
								conn.query('INSERT INTO software (name, version, products, lic_type, lic_server_port, num_lic, fac_id, vend_id, files, comments) VALUES ( \'' + req.body.sw_name + '\',\'' + req.body.version + '\',\'' + req.body.products + '\',\'' + req.body.lic_type + '\',\'' + req.body.lic_server_port + '\',\'' + req.body.num_lic + '\',\'' + req.body.fac_name + '\',\'' + vend_id + '\',\'' + req.body.files + '\',\'' + req.body.sw_comments +  '\')' ,function(err22){
									if(err22) {
										console.log("Error 22");
										res.send('-2');
									}
									else {
										conn.query('UPDATE software SET time_stamp=NOW() WHERE name=\'' + req.body.sw_name + '\'',function(err23){
											if(err23) {
												console.log("Error 23");
												res.send('-2');
											}
											else {
												console.log("Successful Register");
												res.send('1');
											}
										});
									}
								});
							}
						}
					});
				}
				//Fac, No Vend
				else if((req.body.fac_name!="")&&(req.body.vend_name=="")){					
					conn.query('SELECT id FROM fac_staff WHERE name=\'' + req.body.fac_name + '\'' ,function(err31,res31){
						if(err31) {
							console.log("Error 31");
							res.send('-2');
						}
						else {
							if(res31==""){
								console.log("No Such Faculty");
								res.send('-3');
							}
							else{
								var fac_id = res31[0].id;
								conn.query('INSERT INTO software (name, version, products, lic_type, lic_server_port, num_lic, fac_id, vend_id, files, comments) VALUES ( \'' + req.body.sw_name + '\',\'' + req.body.version + '\',\'' + req.body.products + '\',\'' + req.body.lic_type + '\',\'' + req.body.lic_server_port + '\',\'' + req.body.num_lic + '\',\'' + fac_id + '\',\'' + req.body.vend_name + '\',\'' + req.body.files + '\',\'' + req.body.sw_comments +  '\')' ,function(err32){
									if(err32) {
										console.log("Error 32");
										res.send('-2');
									}
									else {
										conn.query('UPDATE software SET time_stamp=NOW() WHERE name=\'' + req.body.sw_name + '\'',function(err33){
											if(err33) {
												console.log("Error 33");
												res.send('-2');
											}
											else {
												console.log("Successful Register");
												res.send('1');
											}
										});
									}
								});
							}
						}
					});
				}
				//Fac, Vend
				else if((req.body.fac_name!="")&&(req.body.vend_name!="")){
					conn.query('SELECT id FROM fac_staff WHERE name=\'' + req.body.fac_name + '\'' ,function(err41,res41){
						if(err41) {
							console.log("Error 41");
							res.send('-2');
						}
						else {
							if(res41==""){
								console.log("No Such Faculty");
								res.send('-3');
							}
							else{
								var fac_id = res41[0].id;
								conn.query('SELECT id FROM vendors WHERE name=\'' + req.body.vend_name + '\'' ,function(err42,res42){
									if(err42) {
										console.log("Error 42");
										res.send('-2');
									}
									else {
										if(res42==""){
											console.log("No Such Vendor");
											res.send('-4');
										}
										else{
											var vend_id = res42[0].id;
											conn.query('INSERT INTO software (name, version, products, lic_type, lic_server_port, num_lic, fac_id, vend_id, files, comments) VALUES ( \'' + req.body.sw_name + '\',\'' + req.body.version + '\',\'' + req.body.products + '\',\'' + req.body.lic_type + '\',\'' + req.body.lic_server_port + '\',\'' + req.body.num_lic + '\',\'' + fac_id + '\',\'' + vend_id + '\',\'' + req.body.files + '\',\'' + req.body.sw_comments +  '\')' ,function(err43){
												if(err43) {
													console.log("Error 43");
													res.send('-2');
												}
												else {
													conn.query('UPDATE software SET time_stamp=NOW() WHERE name=\'' + req.body.sw_name + '\'',function(err44){
														if(err44) {
															console.log("Error 44");
															res.send('-2');
														}
														else {
															console.log("Successful Register");
															res.send('1');
														}
													});
												}
											});
										}
									}
								});
							}
						}
					});
				}
			}
		}
	});	
});

app.post('/update_sw',urlencodedParser,function(req,res){
	
	//res.header("Access-Control-Allow-Origin", "*");
	//res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
	
	conn.query('SELECT * FROM software WHERE name=\'' + req.body.sw_name + '\'' ,function(err1,res1){
		if(err1){
			console.log("Error 1");
			res.send('-2');
		}
		else{
			if(res1==""){
				console.log("Not Existed");
				res.send('0');
			}
			else{
				//No Fac, No Vend
				if((req.body.fac_name=="")&&(req.body.vend_name=="")){
					conn.query('UPDATE software SET version=\''+req.body.version+'\',products=\''+req.body.products+'\',lic_type=\''+req.body.lic_type+'\',lic_server_port=\''+req.body.lic_server_port+'\',num_lic=\''+req.body.num_lic+'\',fac_id=\''+req.body.fac_name+'\',vend_id=\''+req.body.vend_name+ '\',files=\''+ req.body.files + '\',comments=\''+req.body.sw_comments+'\', time_stamp=NOW() WHERE name=\'' + req.body.sw_name + '\'' ,function(err11){
						if(err11) {
							console.log("Error 11");
							res.send('-2');
						}
						else {
							console.log("Successful Update");
							res.send('1');
						}
					});
				}
				//No Fac, Vend
				else if((req.body.fac_name=="")&&(req.body.vend_name!="")){
					conn.query('SELECT id FROM vendors WHERE name=\'' + req.body.vend_name + '\'' ,function(err21,res21){
						if(err21) {
							console.log("Error 21");
							res.send('-2');
						}
						else {
							if(res21==""){
								console.log("No Such Vendor");
								res.send('-4');
							}
							else{	
								var vend_id = res21[0].id;
								conn.query('UPDATE software SET version=\''+req.body.version+'\',products=\''+req.body.products+'\',lic_type=\''+req.body.lic_type+'\',lic_server_port=\''+req.body.lic_server_port+'\',num_lic=\''+req.body.num_lic+'\',fac_id=\''+req.body.fac_name+'\',vend_id=\''+vend_id+ '\',files=\''+ req.body.files +'\',comments=\''+req.body.sw_comments+'\', time_stamp=NOW() WHERE name=\'' + req.body.sw_name + '\'' ,function(err22){
									if(err22) {
										console.log("Error 22");
										res.send('-2');
									}
									else {
										console.log("Successful Update");
										res.send('1');
									}
								});
							}
						}
					});
				}
				//Fac, No Vend
				else if((req.body.fac_name!="")&&(req.body.vend_name=="")){					
					conn.query('SELECT id FROM fac_staff WHERE name=\'' + req.body.fac_name + '\'' ,function(err31,res31){
						if(err31) {
							console.log("Error 31");
							res.send('-2');
						}
						else {
							if(res31==""){
								console.log("No Such Faculty");
								res.send('-3');
							}
							else{
								var fac_id = res31[0].id;
								conn.query('UPDATE software SET version=\''+req.body.version+'\',products=\''+req.body.products+'\',lic_type=\''+req.body.lic_type+'\',lic_server_port=\''+req.body.lic_server_port+'\',num_lic=\''+req.body.num_lic+'\',fac_id=\''+fac_id+'\',vend_id=\''+req.body.vend_name+'\',files=\''+ req.body.files+'\',comments=\''+req.body.sw_comments+'\', time_stamp=NOW() WHERE name=\'' + req.body.sw_name + '\'' ,function(err32){
									if(err32) {
										console.log("Error 32");
										res.send('-2');
									}
									else {
										console.log("Successful Update");
										res.send('1');
									}
								});
							}
						}
					});
				}
				//Fac, Vend
				else if((req.body.fac_name!="")&&(req.body.vend_name!="")){
					conn.query('SELECT id FROM fac_staff WHERE name=\'' + req.body.fac_name + '\'' ,function(err41,res41){
						if(err41) {
							console.log("Error 41");
							res.send('-2');
						}
						else {
							if(res41==""){
								console.log("No Such Faculty");
								res.send('-3');
							}
							else{
								var fac_id = res41[0].id;
								conn.query('SELECT id FROM vendors WHERE name=\'' + req.body.vend_name + '\'' ,function(err42,res42){
									if(err42) {
										console.log("Error 42");
										res.send('-2');
									}
									else {
										if(res42==""){
											console.log("No Such Vendor");
											res.send('-4');
										}
										else{
											var vend_id = res42[0].id;
											conn.query('UPDATE software SET version=\''+req.body.version+'\',products=\''+req.body.products+'\',lic_type=\''+req.body.lic_type+'\',lic_server_port=\''+req.body.lic_server_port+'\',num_lic=\''+req.body.num_lic+'\',fac_id=\''+fac_id+'\',vend_id=\''+vend_id+'\',files=\''+ req.body.files+'\',comments=\''+req.body.sw_comments+'\', time_stamp=NOW() WHERE name=\'' + req.body.sw_name + '\'' ,function(err43){
												if(err43) {
													console.log("Error 43");
													res.send('-2');
												}
												else {
													console.log("Successful Update");
													res.send('1');
												}
											});
										}
									}
								});
							}
						}
					});
				}
			}
		}
	});
});

app.post('/del_sw',urlencodedParser,function(req,res){
	
	//res.header("Access-Control-Allow-Origin", "*");
	//res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
	
	conn.query('SELECT * FROM software WHERE name=\'' + req.body.sw_name + '\'' ,function(err1,res1){
		if(err1) {
			console.log("Error 1");
			res.send('-2');
		}
		else {
			if(res1==""){
				console.log("No match");
				res.send('0');
			}
			else{
				conn.query('DELETE FROM software WHERE name=\'' + req.body.sw_name + '\'' ,function(err2){
					if(err2) {
						console.log("Error 2");
						res.send('-2');
					}
					else {
						console.log("Successful Delete");
						res.send('1');
					}
				});
			}
		}
	});
});

app.post('/upload_files', upload.any(), function(req,res){
	
	console.log("Files are uploaded");
	res.send("1");

});

//curl -l http://localhost:8081/truncate_sw
app.get('/truncate_sw',urlencodedParser,function(req,res){
	conn.query('TRUNCATE TABLE software' ,function(err){
		if(err) {
			console.log("Error");
		}
		else {
			console.log("software table is reset");
			res.send('1');
		}
	});
});

//=================================================================

app.post('/autocomplete_fac',urlencodedParser,function(req,res){
	conn.query('SELECT name FROM fac_staff WHERE name LIKE \'%'+req.body.name+'%\'',function(err,res1){
		if(err) {
			console.log("Error");
			res.send('-2');
		}
		else{
			var data = [];
			for(var i = 0 ; i<res1.length ; i++)
				if(res1[i].name!='')
					data.push(res1[i].name);
			res.send(JSON.stringify(data));	
			console.log("Autocomplete");
		}
	});
});

app.post('/search_fac',urlencodedParser,function(req,res){
		
	//res.header("Access-Control-Allow-Origin", "*");
	//res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
	
	conn.query('SELECT * FROM fac_staff WHERE name=\'' + req.body.name + '\'' ,function(err1,res1){
		if(err1) {
			console.log("Error 1");
			res.send('-2');
		}
		else {
			if(res1==""){
				console.log("No Match");
				res.send('0');
			}
			else{
				console.log("Successful Search");
				res.setHeader('Content-Type', 'application/json');
				res.send(JSON.stringify(res1));
			}
		}
	});
});

app.post('/reg_fac',urlencodedParser,function(req,res){
		
	//res.header("Access-Control-Allow-Origin", "*");
	//res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
	
	conn.query('SELECT * FROM fac_staff WHERE name=\'' + req.body.name + '\'' ,function(err1,res1){
		if(err1){
			console.log("Error 1");
			res.send('-2');
		}
		else{
			if(res1!=""){
				console.log("already registered");
				res.send('-1');
			}
			else{
				conn.query('INSERT INTO fac_staff ( type, name, position, fac, dept, office, email, phone, mobile, comments) VALUES (\'' + req.body.type + '\',\'' + req.body.name + '\',\'' + req.body.position + '\',\'' + req.body.fac + '\',\'' + req.body.dept + '\',\'' + req.body.office + '\',\'' + req.body.email + '\',\'' + req.body.phone + '\',\'' + req.body.mobile + '\',\'' + req.body.comments + '\')' ,function(err2){
					if(err2) {
						console.log("Error 2");
						res.send('-2');
					}
					else {
						conn.query('UPDATE fac_staff SET time_stamp=NOW() WHERE name=\'' + req.body.name + '\'' ,function(err3){
							if(err2) {
								console.log("Error 3");
								res.send('-2');
							}
							else {
								console.log("Successful Register");
								res.send('1');
							}
						});
					}
				});
			}
		}
	});

});

app.post('/update_fac',urlencodedParser,function(req,res){
			
	//res.header("Access-Control-Allow-Origin", "*");
	//res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
	
	conn.query('SELECT * FROM fac_staff WHERE name=\'' + req.body.name + '\'' ,function(err1,res1){
		if(err1){
			console.log("Error 1");
			res.send('-2');
		}
		else{
			if(res1==""){
				console.log("No Match");
				res.send('0');
			}
			else{
				conn.query('UPDATE fac_staff SET type=\''+req.body.type+'\',name=\''+req.body.name+'\',position=\''+req.body.position+'\', fac=\''+req.body.fac+'\',dept=\''+req.body.dept+'\',office=\''+req.body.office+'\',email=\''+req.body.email+'\',phone=\''+req.body.phone+'\',mobile=\''+req.body.mobile+'\',comments=\''+req.body.comments+'\', time_stamp=NOW() WHERE name=\''+req.body.name + '\'' ,function(err2){
					if(err2) {
						console.log("Error 2");
						res.send('-2');
					}
					else {
						console.log("Successful Update");
						res.send('1');
					}
				});
			}
		}
	});
});

app.post('/del_fac',urlencodedParser,function(req,res){
		
	//res.header("Access-Control-Allow-Origin", "*");
	//res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
	
	conn.query('SELECT * FROM fac_staff WHERE name=\'' + req.body.name + '\'' ,function(err1,res1){
		if(err1) {
			console.log("Error 1");
			res.send('-2');
		}
		else {
			if(res1==""){
				console.log("No Match");
				res.send('0');
			}
			else{
				conn.query('DELETE FROM fac_staff WHERE name=\'' + req.body.name + '\'' ,function(err2){
					if(err2) {
						console.log("Error 2");
						res.send('-2');
					}
					else {
						console.log("Successful Delete");
						res.send('1');
					}
				});
			}
		}
	});
});

//curl -l http://localhost:8081/truncate_fac
app.get('/truncate_fac',urlencodedParser,function(req,res){
	conn.query('TRUNCATE TABLE fac_staff' ,function(err){
		if(err) {
			console.log("Error");
		}
		else {
			console.log("Fac/Staff table is reset");
			res.send('1');
		}
	});
});

//=================================================================

app.post('/autocomplete_vend',urlencodedParser,function(req,res){
	conn.query('SELECT name FROM vendors WHERE name LIKE \'%'+req.body.name+'%\'',function(err,res1){
		if(err) {
			console.log("Error");
			res.send('-2');
		}
		else{
			var data = [];
			for(var i = 0 ; i<res1.length ; i++)
				if(res1[i].name!='')
					data.push(res1[i].name);
			res.send(JSON.stringify(data));		
			console.log("Autocomplete");
		}
	});
});

app.post('/search_vend',urlencodedParser,function(req,res){
	
	//res.header("Access-Control-Allow-Origin", "*");
	//res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
	
	conn.query('SELECT * FROM vendors WHERE name=\'' + req.body.name + '\'' ,function(err1,res1){
		if(err1) {
			console.log("Error 1");
			res.send('-2');
		}
		else {
			if(res1==""){
				console.log("No Match");
				res.send('0');
			}
			else{
				console.log("Successful Search");
				res.setHeader('Content-Type', 'application/json');
				res.send(JSON.stringify(res1));
			}
		}
	});
});

app.post('/reg_vend',urlencodedParser,function(req,res){
	
	//res.header("Access-Control-Allow-Origin", "*");
	//res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
	
	conn.query('SELECT * FROM vendors WHERE name=\'' + req.body.name + '\'' ,function(err1,res1){
		if(err1){
			console.log("Error 1");
			res.send('-2');
		}
		else{
			if(res1!=""){
				console.log("Already Registered");
				res.send('-1');
			}
			else{	
				conn.query('INSERT INTO vendors (name, address, email, phone, sp_contact, comments) VALUES ( \'' + req.body.name + '\',\'' + req.body.address + '\',\'' + req.body.email + '\',\'' + req.body.phone + '\',\'' + req.body.sp_contact + '\',\'' + req.body.comments +  '\')' ,function(err2){	
					if(err2) {
						console.log("Error 2");
						res.send('-2');
					}
					else {
						conn.query('UPDATE vendors SET time_stamp=NOW() WHERE name=\'' + req.body.name + '\'' ,function(err3){
							if(err3) {
								console.log("Error 3");
								res.send('-2');
							}
							else {
								console.log("Successful Register");
								res.send('1');
							}
						});
					}
				});
			}
		}
	});
});

app.post('/update_vend',urlencodedParser,function(req,res){
		
	//res.header("Access-Control-Allow-Origin", "*");
	//res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
	
	conn.query('SELECT * FROM vendors WHERE name=\'' + req.body.name + '\'' ,function(err1,res1){
		if(err1){
			console.log("Error 1");
			res.send('-2');
		}
		else{
			if(res1==""){
				console.log("Not Existed");
				res.send('0');
			}
			else{
				conn.query('UPDATE vendors SET name=\''+req.body.name+'\',address=\''+req.body.address+'\',email=\''+req.body.email+'\',phone=\''+req.body.phone+'\',sp_contact=\''+req.body.sp_contact+'\',comments=\''+req.body.comments+'\', time_stamp=NOW() WHERE name=\''+req.body.name+'\'' ,function(err2){
					if(err2) {
						console.log("Error 2");
						res.send('-2');
					}
					else {
						console.log("Successful Update");
						res.send('1');
					}
				});
			}
		}
	});
});

app.post('/del_vend',urlencodedParser,function(req,res){
		
	//res.header("Access-Control-Allow-Origin", "*");
	//res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
	
	conn.query('SELECT * FROM vendors WHERE name=\'' + req.body.name + '\'' ,function(err1,res1){
		if(err1) {
			console.log("Error 1");
			res.send('-2');
		}
		else {
			if(res1==""){
				console.log("No Match");
				res.send('0');
			}
			else{
				conn.query('DELETE FROM vendors WHERE name=\'' + req.body.name + '\'' ,function(err2){
					if(err2) {
						console.log("Error 2");
						res.send('-2');
					}
					else {
						console.log("Successful Delete");
						res.send('1');
					}
				});
			}
		}
	});
});

//curl -l http://localhost:8081/truncate_vend
app.get('/truncate_vend',urlencodedParser,function(req,res){
	conn.query('TRUNCATE TABLE vendors' ,function(err){
		if(err) {
			console.log("Error");
		}
		else {
			console.log("Vendors table is reset");
			res.send('1');
		}
	});
});

//=================================================================

app.post('/autocomplete_user',urlencodedParser,function(req,res){
	
	conn.query('SELECT user_fname FROM users WHERE user_fname LIKE \'%'+req.body.user_fname+'%\'',function(err,res1){
		if(err) {
			console.log("Error");
			res.send('-2');
		}
		else{
			var data = [];
			for(var i = 0 ; i<res1.length ; i++)
				if(res1[i].user_fname!='')
					data.push(res1[i].user_fname);
			res.send(JSON.stringify(data));		
			console.log("Autocomplete");
		}
	});
});

app.post('/search_user',urlencodedParser,function(req,res){
	
	//res.header("Access-Control-Allow-Origin", "*");
	//res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
	
	conn.query('SELECT * FROM users WHERE user_fname=\'' + req.body.user_fname + '\'' ,function(err1,res1){
		if(err1) {
			console.log("Error");
			res.send('-2');
		}
		else {
			if(res1==""){
				console.log("No Match");
				res.send('0');
			}
			else{
				console.log("Successful Search");
				res.setHeader('Content-Type', 'application/json');
				res.send(JSON.stringify(res1));		
			}
		}
	});
});

app.post('/reg_user',urlencodedParser,function(req,res){
	
	//res.header("Access-Control-Allow-Origin", "*");
	//res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
	
	conn.query('SELECT * FROM users WHERE user_fname=\'' + req.body.user_fname + '\'' ,function(err1,res1){
		if(err1){
			console.log("Error 1");
			res.send('-2');
		}
		else{
			if(res1!=""){
				console.log("Already Registered");
				res.send('-1');
			}
			else{
				if(req.body.is_fac=='false'){
					conn.query('INSERT INTO users (user_fname, user_name, user_pass, user_priv) VALUES (\'' + req.body.user_fname + '\',\'' + req.body.user_name + '\',\'' + req.body.user_pass + '\',\'' + req.body.user_priv + '\')' ,function(err11){
						if(err11) {
							console.log("Error 11");
							res.send('-2');
						}
						else {
							conn.query('UPDATE users SET time_stamp=NOW() WHERE user_fname=\'' + req.body.user_fname + '\'' ,function(err12){
								if(err12) {
									console.log("Error 12");
									res.send('-2');
								}
								else {
									console.log("Successful Register");
									res.send('1');
								}
							});
						}
					});
				}
				else if(req.body.is_fac=='true'){
					conn.query('SELECT id FROM fac_staff WHERE name=\'' + req.body.user_fname + '\'' ,function(err21,res21){
						if(err21) {
							console.log("Error 21");
							res.send('-2');
						}
						else {
							if(res21==""){
								console.log("No Such Fac/Staff member");
								res.send('-3');
							}
							else{
								var fac_id = res21[0].id;
								conn.query('INSERT INTO users (user_fname, fac_id, user_name, user_pass, user_priv) VALUES (\''+ req.body.user_fname + '\',\'' + fac_id + '\',\'' + req.body.user_name + '\',\'' + req.body.user_pass + '\',\'' + req.body.user_priv + '\')' ,function(err22){
									if(err22) {
										console.log("Error 22");
										res.send('-2');
									}
									else {
										conn.query('UPDATE users SET time_stamp=NOW() WHERE user_name=\'' + req.body.user_name + '\'' ,function(err23){
											if(err23) {
												console.log("Error 23");
												res.send('-2');
											}
											else {
												console.log("Successful Register");
												res.send('1');
											}
										});
									}
								});
							}
						}
					});
				}
			}
		}
	});
});

app.post('/update_user',urlencodedParser,function(req,res){
		
	//res.header("Access-Control-Allow-Origin", "*");
	//res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
	
	conn.query('SELECT * FROM users WHERE user_fname=\'' + req.body.user_fname + '\'' ,function(err1,res1){
		if(err1){
			console.log("Error 1");
			res.send('-2');
		}
		else{
			if(res1==""){
				console.log("Not Existed");
				res.send('0');
			}
			else{
				if(req.body.is_fac=='false'){
					conn.query('UPDATE users SET user_name=\''+req.body.user_name+'\',user_pass=\''+req.body.user_pass+'\',user_priv=\''+req.body.user_priv+'\', time_stamp=NOW() WHERE user_fname=\''+req.body.user_fname+'\'',function(err11){
						if(err11) {
							console.log("Error 11");
							res.send('-2');
						}
						else {
							console.log("Successful Update");
							res.send('1');
						}
					});
				}
				else if(req.body.is_fac=='true'){
					conn.query('SELECT id FROM fac_staff WHERE name=\'' + req.body.user_fname + '\'' ,function(err21,res21){
						if(err21) {
							console.log("Error 21");
							res.send('-2');
						}
						else {
							if(res21==""){
								console.log("No Such Fac/Staff member");
								res.send('-3');
							}
							else{
								var fac_id = res21[0].id;
								conn.query('UPDATE users SET fac_id=\''+fac_id+'\',user_name=\''+req.body.user_name+'\',user_pass=\''+ req.body.user_pass +'\',user_priv=\''+req.body.user_priv+'\', time_stamp=NOW() WHERE user_fname=\''+req.body.user_fname+'\'',function(err22){
									if(err22) {
										console.log("Error 22");
										res.send('-2');
									}
									else {
										console.log("Successful Update");
										res.send('1');
									}
								});
							}
						}
					});
				}
			}
		}
	});
});

app.post('/del_user',urlencodedParser,function(req,res){
			
	//res.header("Access-Control-Allow-Origin", "*");
	//res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
	
	conn.query('SELECT * FROM users WHERE user_fname=\'' + req.body.user_fname + '\'' ,function(err1,res1){
		if(err1) {
			console.log("Error 1");
			res.send('-2');
		}
		else {
			if(res1==""){
				console.log("No Match");
				res.send('0');
			}
			else{	
				conn.query('DELETE FROM users WHERE user_fname=\'' + req.body.user_fname + '\'' ,function(err2){
					if(err2) {
						console.log("Error 2");
						res.send('-2');
					}
					else {
						console.log("Successful Delete");
						res.send('1');
					}
				});
			}
		}
	});
});

//curl -l http://localhost:8081/truncate_users
app.get('/truncate_users',urlencodedParser,function(req,res){
	conn.query('TRUNCATE TABLE users' ,function(err){
		if(err) {
			console.log("Error");
		}
		else {
			console.log("Users table is reset");
			res.send('1');
		}
	});
});

//=================================================================

app.post('/save_a_dean',urlencodedParser,function(req,res){
	
	conn.query('SELECT * FROM variables WHERE row=0' ,function(err1,res1){
		if(err1){
			console.log("Error 1");
			res.send('-2');
		}
		else{
			if(res1!=""){
				conn.query('UPDATE variables SET a_dean_name=\''+req.body.a_dean_name+'\',a_dean_email=\''+req.body.a_dean_email+'\' WHERE row=0' ,function(err2){
					if(err2) {
						console.log("Error 2");
						res.send('-2');
					}
					else {
						console.log("Successful Save");
						res.send('1');
					}
				});
			}
			else{	
				conn.query('INSERT INTO variables (row, a_dean_name, a_dean_email) VALUES (0, \'' + req.body.a_dean_name + '\',\'' + req.body.a_dean_email + '\')' ,function(err2){	
					if(err2) {
						console.log("Error 2");
						res.send('-2');
					}
					else {
						console.log("Successful Save");
						res.send('1');
					}
				});
			}
		}
	});
});

app.post('/save_ad_assis',urlencodedParser,function(req,res){
	
	conn.query('SELECT * FROM variables WHERE row=0' ,function(err1,res1){
		if(err1){
			console.log("Error 1");
			res.send('-2');
		}
		else{
			if(res1!=""){
				conn.query('UPDATE variables SET ad_assis_name=\''+req.body.ad_assis_name+'\',ad_assis_email=\''+req.body.ad_assis_email+'\' WHERE row=0' ,function(err2){
					if(err2) {
						console.log("Error 2");
						res.send('-2');
					}
					else {
						console.log("Successful Save");
						res.send('1');
					}
				});
			}
			else{	
				conn.query('INSERT INTO variables (row, ad_assis_name, ad_assis_email) VALUES (0, \'' + req.body.ad_assis_name + '\',\'' + req.body.ad_assis_email + '\')' ,function(err2){	
					if(err2) {
						console.log("Error 2");
						res.send('-2');
					}
					else {
						console.log("Successful Save");
						res.send('1');
					}
				});
			}
		}
	});
});

app.post('/save_rec_email',urlencodedParser,function(req,res){
	
	conn.query('SELECT * FROM variables WHERE row=0' ,function(err1,res1){
		if(err1){
			console.log("Error 1");
			res.send('-2');
		}
		else{
			if(res1!=""){
				conn.query('UPDATE variables SET rec_email=\''+req.body.rec_email+'\' WHERE row=0' ,function(err2){
					if(err2) {
						console.log("Error 2");
						res.send('-2');
					}
					else {
						console.log("Successful Save");
						res.send('1');
					}
				});
			}
			else{	
				conn.query('INSERT INTO variables (row, rec_email) VALUES (0, \'' + req.body.rec_email + '\')' ,function(err2){	
					if(err2) {
						console.log("Error 2");
						res.send('-2');
					}
					else {
						console.log("Successful Save");
						res.send('1');
					}
				});
			}
		}
	});
});

app.post('/save_purch_auto_email',urlencodedParser,function(req,res){
	console.log(req.body.purch_auto_email);
	conn.query('SELECT * FROM variables WHERE row=0' ,function(err1,res1){
		if(err1){
			console.log("Error 1");
			res.send('-2');
		}
		else{
			if(res1!=""){
				conn.query('UPDATE variables SET purch_auto_email=\''+req.body.purch_auto_email+'\' WHERE row=0' ,function(err2){
					if(err2) {
						console.log("Error 2");
						res.send('-2');
					}
					else {
						console.log("Successful Save");
						res.send('1');
					}
				});
			}
			else{	
				conn.query('INSERT INTO variables (row, purch_auto_email) VALUES (0, \'' + req.body.purch_auto_email + '\')' ,function(err2){	
					if(err2) {
						console.log("Error 2");
						res.send('-2');
					}
					else {
						console.log("Successful Save");
						res.send('1');
					}
				});
			}
		}
	});
});

app.post('/save_renew_auto_email',urlencodedParser,function(req,res){
	
	conn.query('SELECT * FROM variables WHERE row=0' ,function(err1,res1){
		if(err1){
			console.log("Error 1");
			res.send('-2');
		}
		else{
			if(res1!=""){
				conn.query('UPDATE variables SET renew_auto_email=\''+req.body.renew_auto_email+'\' WHERE row=0' ,function(err2){
					if(err2) {
						console.log("Error 2");
						res.send('-2');
					}
					else {
						console.log("Successful Save");
						res.send('1');
					}
				});
			}
			else{	
				conn.query('INSERT INTO variables (row, renew_auto_email) VALUES (0, \'' + req.body.renew_auto_email + '\')' ,function(err2){	
					if(err2) {
						console.log("Error 2");
						res.send('-2');
					}
					else {
						console.log("Successful Save");
						res.send('1');
					}
				});
			}
		}
	});
});

app.post('/save_deliv_auto_email',urlencodedParser,function(req,res){
	
	conn.query('SELECT * FROM variables WHERE row=0' ,function(err1,res1){
		if(err1){
			console.log("Error 1");
			res.send('-2');
		}
		else{
			if(res1!=""){
				conn.query('UPDATE variables SET deliv_auto_email=\''+req.body.deliv_auto_email+'\' WHERE row=0' ,function(err2){
					if(err2) {
						console.log("Error 2");
						res.send('-2');
					}
					else {
						console.log("Successful Save");
						res.send('1');
					}
				});
			}
			else{	
				conn.query('INSERT INTO variables (row, deliv_auto_email) VALUES (0, \'' + req.body.deliv_auto_email + '\')' ,function(err2){	
					if(err2) {
						console.log("Error 2");
						res.send('-2');
					}
					else {
						console.log("Successful Save");
						res.send('1');
					}
				});
			}
		}
	});
});

app.post('/check_variables',urlencodedParser,function(req,res){
	
	conn.query('SELECT * FROM variables WHERE row=0' ,function(err1,res1){
		if(err1){
			console.log("Error 1");
			res.send('-2');
		}
		else{
			if(res1==""){
				console.log("No Match");
				res.send('0');
			}
			else{
				res1[0].a_dean_name	 	 = res1[0].a_dean_name.replace(/%20/g, " ");
				res1[0].a_dean_email 	 = res1[0].a_dean_email.replace(/%20/g, " ");
				res1[0].ad_assis_name 	 = res1[0].ad_assis_name.replace(/%20/g, " ");
				res1[0].ad_assis_email 	 = res1[0].ad_assis_email.replace(/%20/g, " ");
				res1[0].rec_email 		 = res1[0].rec_email.replace(/%20/g, " ");
				res1[0].purch_auto_email = res1[0].purch_auto_email.replace(/%20/g, " ");
				res1[0].renew_auto_email = res1[0].renew_auto_email.replace(/%20/g, " ");
				res1[0].deliv_auto_email = res1[0].deliv_auto_email.replace(/%20/g, " ");
				
				console.log("Successful Check");
				res.setHeader('Content-Type', 'application/json');
				res.send(JSON.stringify(res1));
			}
		}
	});
});

//=================================================================

app.post('/lic_sw',urlencodedParser,function(req,res){
	
	var st_date 	 = format_date(req.body.st_date); 
	var end_date 	 = format_date(req.body.end_date); 
	
	conn.query('SELECT * FROM sw_operations' ,function(err1,res1){
		if(err1) {
			console.log("Error 1");
			res.send('-2');
		}
		else {
			var sw_ids = [];
			for(var i = 0 ; i<res1.length ; i++){
				if(res1[i].sw_id!='') 
					sw_ids.push(res1[i].sw_id);
				res1[i].order_date 	 = obj_to_date(res1[i].order_date);
				res1[i].rec_date 	 = obj_to_date(res1[i].rec_date);
				res1[i].lic_str_date = obj_to_date(res1[i].lic_str_date);
				res1[i].lic_exp_date = obj_to_date(res1[i].lic_exp_date);
			}
			if(sw_ids=="") sw_ids.push(9999999999);
			
			conn.query('SELECT * FROM software WHERE id IN (' + sw_ids + ')' ,function(err2,res2){
				if(err1) {
					console.log("Error 2");
					res.send('-2');
				}
				else {
					var ven_ids = [];
					for(var i = 0 ; i<res2.length ; i++)
						if(res2[i].vend_id!='') 
							ven_ids.push(res2[i].vend_id);
					if(ven_ids=="") ven_ids.push(9999999999);
					
					conn.query('SELECT * FROM vendors WHERE id IN (' + ven_ids + ')' ,function(err3,res3){
						if(err3) {
							console.log("Error 3");
							res.send('-2');
						}
						else {
							var fac_ids = [];
							for(var i = 0 ; i<res2.length ; i++)
								if(res2[i].fac_id!='')
									fac_ids.push(res2[i].fac_id);
							if(fac_ids=="") fac_ids.push(9999999999);
							
							conn.query('SELECT * FROM fac_staff WHERE id IN (' + fac_ids + ')' ,function(err4,res4){
								if(err4) {
									console.log("Error 4");
									res.send('-2');
								}
								else {
									//replacing the vend_id with vend_name
									for(var i = 0 ; i<res2.length ; i++)
										for(var j = 0 ; j<res3.length ; j++)
											if(res2[i].vend_id==res3[j].id)
												res2[i].vend_id = res3[j].name;
									
									//replacing the fac_id with fac name
									for(var i = 0 ; i<res2.length ; i++)
										for(var j = 0 ; j<res4.length ; j++)
											if(res2[i].fac_id==res4[j].id)
												res2[i].fac_id = res4[j].name;
									
									//merging res1 and res2
									var result = [];
									for(var i = 0 ; i<res1.length ; i++)
										for(var j = 0 ; j<res1.length ; j++)
											if(res1[i].sw_id==res2[j].id)
												result[i] = extend({}, res2[j], res1[i]);  //the order is important
										
									console.log("lic_sw");
									res.setHeader('Content-Type', 'application/json');
									res.send(JSON.stringify(result));
								}
								
							});
						}
					});
				}
			});
		}
	});
});

app.post('/sw_expiry',urlencodedParser,function(req,res){
	
	var st_date 	 = format_date(req.body.st_date); 
	var end_date 	 = format_date(req.body.end_date); 
	
	conn.query('SELECT * FROM sw_operations WHERE lic_exp_date BETWEEN \'' + st_date + '\' AND \''+ end_date + '\' ORDER BY lic_exp_date' ,function(err1,res1){
		if(err1) {
			console.log("Error 1");
			res.send('-2');
		}
		else {
			var sw_ids = [];
			for(var i = 0 ; i<res1.length ; i++){
				if(res1[i].sw_id!='')
					sw_ids.push(res1[i].sw_id);
				res1[i].lic_str_date = obj_to_date(res1[i].lic_str_date);
				res1[i].lic_exp_date = obj_to_date(res1[i].lic_exp_date);
			}
			if(sw_ids=="") sw_ids.push(9999999999);
			
			conn.query('SELECT * FROM software WHERE id IN (' + sw_ids + ')' ,function(err2,res2){
				if(err1) {
					console.log("Error 2");
					res.send('-2');
				}
				else {
					var ven_ids = [];
					for(var i = 0 ; i<res2.length ; i++)
						if(res2[i].vend_id!='')
							ven_ids.push(res2[i].vend_id);
					if(ven_ids=="") sw_ids.push(9999999999);
					
					conn.query('SELECT * FROM vendors WHERE id IN (' + ven_ids + ')' ,function(err3,res3){
						if(err3) {
							console.log("Error 3");
							res.send('-2');
						}
						else {
							for(var i = 0 ; i<res2.length ; i++)
								for(var j = 0 ; j<res3.length ; j++)
									if(res2[i].vend_id==res3[j].id)
										res2[i].vend_id = res3[j].name;
							
							var result = [];
							for(var i = 0 ; i<res1.length ; i++)
								for(var j = 0 ; j<res1.length ; j++)
									if(res1[i].sw_id==res2[j].id)
										result[i] = extend({}, res2[j], res1[i]);  //the order is important
								
							console.log("sw_exp");
							res.setHeader('Content-Type', 'application/json');
							res.send(JSON.stringify(result));
						}
					});
				}
			});
		}
	});
});

app.post('/sw_orders',urlencodedParser,function(req,res){
	
	var st_date 	 = format_date(req.body.st_date); 
	var end_date 	 = format_date(req.body.end_date); 
	
	conn.query('SELECT * FROM sw_operations WHERE received=\'0\' AND order_date BETWEEN \'' + st_date + '\' AND \''+ end_date + '\' ORDER BY lic_exp_date' ,function(err1,res1){
		if(err1) {
			console.log("Error 1");
			res.send('-2');
		}
		else {
			var sw_ids = [];
			for(var i = 0 ; i<res1.length ; i++){
				if(res1[i].sw_id!='')
					sw_ids.push(res1[i].sw_id);
				res1[i].order_date 	 = obj_to_date(res1[i].order_date);
			}
			if(sw_ids=="") sw_ids.push(9999999999);
			
			conn.query('SELECT * FROM software WHERE id IN (' + sw_ids + ')' ,function(err2,res2){
				if(err1) {
					console.log("Error 2");
					res.send('-2');
				}
				else {
					var ven_ids = [];
					for(var i = 0 ; i<res2.length ; i++)
						if(res2[i].vend_id!='')
							ven_ids.push(res2[i].vend_id);
					if(ven_ids=="") sw_ids.push(9999999999);
					
					conn.query('SELECT * FROM vendors WHERE id IN (' + ven_ids + ')' ,function(err3,res3){
						if(err3) {
							console.log("Error 3");
							res.send('-2');
						}
						else {
							//Replacing vendor id with vendor name
							for(var i = 0 ; i<res2.length ; i++)
								for(var j = 0 ; j<res3.length ; j++)
									if(res2[i].vend_id==res3[j].id)
										res2[i].vend_id = res3[j].name;
							
							//Merging
							var result = [];
							for(var i = 0 ; i<res1.length ; i++)
								for(var j = 0 ; j<res1.length ; j++)
									if(res1[i].sw_id==res2[j].id)
										result[i] = extend({}, res2[j], res1[i]);  //the order is important
								
							console.log("sw_orders");
							res.setHeader('Content-Type', 'application/json');
							res.send(JSON.stringify(result));
						}
					});
				}
			});
		}
	});
});

app.post('/exp_sw_budget',urlencodedParser,function(req,res){
		
	//var st_date 	 = format_date(req.body.st_date); 
	//var end_date 	 = format_date(req.body.end_date); 
	var today = new Date();
	//console.log(today);
	
	conn.query('SELECT * FROM sw_operations WHERE lic_exp_date < CURDATE() ORDER BY lic_exp_date' ,function(err1,res1){
		if(err1) {
			console.log("Error 1");
			res.send('-2');
		}
		else {
			var sw_ids = [];
			for(var i = 0 ; i<res1.length ; i++){
				if(res1[i].sw_id!='')
					sw_ids.push(res1[i].sw_id);
				res1[i].lic_str_date = obj_to_date(res1[i].lic_str_date);
				res1[i].lic_exp_date = obj_to_date(res1[i].lic_exp_date);
			}
			if(sw_ids=="") sw_ids.push(9999999999);
			
			conn.query('SELECT * FROM software WHERE id IN (' + sw_ids + ')' ,function(err2,res2){
				if(err1) {
					console.log("Error 2");
					res.send('-2');
				}
				else {
					var ven_ids = [];
					for(var i = 0 ; i<res2.length ; i++)
						if(res2[i].vend_id!='')
							ven_ids.push(res2[i].vend_id);
					if(ven_ids=="") ven_ids.push(9999999999);
					
					conn.query('SELECT * FROM vendors WHERE id IN (' + ven_ids + ')' ,function(err3,res3){
						if(err3) {
							console.log("Error 3");
							res.send('-2');
						}
						else {
							for(var i = 0 ; i<res2.length ; i++)
								for(var j = 0 ; j<res3.length ; j++)
									if(res2[i].vend_id==res3[j].id)
										res2[i].vend_id = res3[j].name;
							
							var result = [];
							for(var i = 0 ; i<res1.length ; i++)
								for(var j = 0 ; j<res1.length ; j++)
									if(res1[i].sw_id==res2[j].id)
										result[i] = extend({}, res2[j], res1[i]);  //the order is important
								
							console.log("sw_budget");
							res.setHeader('Content-Type', 'application/json');
							res.send(JSON.stringify(result));
						}
					});
				}
			});
		}
	});	

});

app.post('/fac_dir',urlencodedParser,function(req,res){
		
	//res.header("Access-Control-Allow-Origin", "*");
	//res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
	
	conn.query('SELECT * FROM fac_staff' ,function(err1,res1){
		if(err1) {
			console.log("Error 1");
			res.send('-2');
		}
		else {
			console.log("fac_dir");
			res.setHeader('Content-Type', 'application/json');
			res.send(JSON.stringify(res1));
		}
	});
});

function extend(target) {
    var sources = [].slice.call(arguments, 1);
    sources.forEach(function (source) {
        for (var prop in source) {
            target[prop] = source[prop];
        }
    });
    return target;
}

//=================================================================

http.createServer(app).listen(8081, function () {
   console.log('Server is started :)');
});

