const {dialog} = require('electron').remote;
const fs = require("fs");
const csv = require("fast-csv");
const {ipcRenderer} = require("electron");
const ipc = require('electron').ipcRenderer

var logreportLocation;
var membershipMap = Array.prototype.map;
/*
Membership Map Search Keys
-----------
First name	
Last name	
Address1	
City State
Indiv #
*/
var reportMap = {};
var headers = [];
var indvNumbers = [];
var currentPerson = null;
var blank = false;
var indvNumberGenerator = 1000;


module.exports = {
	/*
	Opens up a dialog to find log file
	*/
	logreportreader: function() {
		//Loading the donation log report
		logreportLocation = dialog.showOpenDialog({properties: ['openFile', 'openDirectory']})[0];

		document.getElementById("log").innerHTML = "Log Location: "+logreportLocation;
	},
	/*
	Opens up a dialong to find membership file
	*/
	membershipReader: function() {
		//Loading the membership information
		var membershipLocation = dialog.showOpenDialog({properties: ['openFile', 'openDirectory']});
		document.getElementById("member").innerHTML  = "Member Location: " + membershipLocation;

		//read in the membership information
		readStream(membershipLocation);
	},
	/*
	Opens a dialog to generate report
	*/
	createReport: function() {
		var stream = fs.createReadStream(logreportLocation);

		//Open stream for log report
		csv.fromStream(stream)
		.on("data", function(data) {
			if(data[0].includes("Giver Name:")) {
				//Found a new giver name
				var splitName = data[0].split(" ");
				var firstName = splitName[2]; //After Giver and Name: the first name
				var lastName = splitName[splitName.length - 1]; //Ending is last name (USUALLY)
				
				//Search by first Name in membership info
				var listByFirst = membershipMap[firstName];
				if(listByFirst == null) {
					//TODO Remove Repeating Code
					
					var manualPerson = {
						'First name': firstName,
						'Last name': lastName,
						'Address1': 'null',
						'City State': 'null',
						'Indiv #': indvNumberGenerator.toString
					}

					reportMap[indvNumberGenerator.toString()] = manualPerson;
					indvNumbers.push(indvNumberGenerator.toString()); //track all indv numbers

					currentPerson = indvNumberGenerator.toString();
					blank = false;
					indvNumberGenerator = indvNumberGenerator + 1;

				}
				else {
					var multiple = false;
					var personCtr = [];
					for(var ctr = 0; ctr<listByFirst.length; ctr++) {
						var profile = listByFirst[ctr];
						if(profile['Last name'] === lastName) {
							personCtr.push(ctr);
						}
					} //END FOR
					if(personCtr.length === 0 ) {						
						var manualPerson = {
						'First name': firstName,
						'Last name': lastName,
						'Address1': 'null',
						'City State': 'null',
						'Indiv #': indvNumberGenerator.toString
						}

						reportMap[indvNumberGenerator.toString()] = manualPerson;
						indvNumbers.push(indvNumberGenerator.toString()); //track all indv numbers

						currentPerson = indvNumberGenerator.toString();
						blank = false;
						indvNumberGenerator = indvNumberGenerator + 1;

					}
					else if(personCtr.length > 1) {
						//Send an async message to record multiple identities
						
						//Find Each person and put into list
						var listOfPeople = [];
						for(var ctr = 0; ctr<personCtr.length; ctr++) {
							listOfPeople.push(listByFirst[personCtr[ctr]]);
						}

						//Sending async message
						ipc.send('list-people',listOfPeople);
						
						currentPerson = null; //set to undefined so we can send messages
						blank = false;
					}
					else {
						//We found an exact match
						var current = listByFirst[personCtr[0]];
						reportMap[current['Indiv #']] = current;
						currentPerson = current['Indiv #']; //who are we working with
						indvNumbers.push(current['Indiv #']); //track all indv numbers
					}
				} //END ELSE
			} //END IF FOR GIVER NAME
			else if(currentPerson == null && blank === true) {
				//TODO What to do if we can't find person in membership

			}
			else if(currentPerson != null) {
				var current = reportMap[currentPerson];
				if(data[0].includes("-")) {
					//At an account. Need to add to current person
					current[data[0]] = data[1];
					reportMap[currentPerson] = current;

					//Found a new account so need to add header for exce sheet
					if(headers.indexOf(data[0]) === -1) {
						headers.push(data[0]);
					}
				}
			}
			//If current person is undefined send their account info to main js
			else {
				//Verify we are at account type
				if(data[0].includes("-")) {
					var mapSend = {};
					mapSend[data[0]] = data[1];

					//async call for account info
					ipc.send('account-type', mapSend);
				}
			}
		})
		.on("end", function() {
			//After report is finished send a finalized message
			ipc.send('finished-report', [reportMap,headers,indvNumbers, true]);
		})
	},
	/*
	Gernate an Excel Sheet
	*/
	generateExcel: function() {
		console.log(reportMap['00059-1']);
	}
}

var readStream = function(membershipLocation) {
	//If no value has been passed then exit
	if(typeof membershipLocation === "undefined") return;
	var stream = fs.createReadStream(membershipLocation[0]);

	//Read stream with header
	csv.fromStream(stream, {headers:true})
	.on("data", function(data) {
		//If data already exists then append to array
		if(data['First name'] in membershipMap) {
			membershipMap[data['First name']].push(data);
		}
		else membershipMap[data['First name']] = new Array(data);
	})
	.on("end", function() {
		document.getElementById("export").disabled = false;
	});
}