const excelbuilder = require('msexcel-builder');
const fs = require("fs");
const ipc = require('electron').ipcRenderer
const {dialog} = require('electron').remote;

//GLOBAL VARIABLE THAT NEED TO BE FILLED
var reportMap;
var headers;
var indvNumbers;

module.exports = {
	generatePage: function() {
		//Giver Values
		var giverGlobalList = require('electron').remote.getGlobal('giverMap');
		var userGlobalList = require('electron').remote.getGlobal('duplicateList');
		var userCtrForGlobal = 0;

		for(var giverValue in giverGlobalList) {
			//Giver Text
			generateGiverText(giverGlobalList[giverValue]);

			//User table
			generateDuplicateNames(userGlobalList[userCtrForGlobal], userCtrForGlobal);
			userCtrForGlobal++;
		}

		//Create Submit button
		var submit = document.createElement("button");
		submit.type = "submit";
		submit.innerHTML = "Finish up";
		document.body.appendChild(submit);

		//Create Event Text
		submit.addEventListener("click", function() {
			var sendList = [];
			//Grab values from radio buttons
			for(userCtrForGlobal=0; userCtrForGlobal<userGlobalList.length; userCtrForGlobal++) {
				//Search by name
				var listOfRadios = document.getElementsByName("INDEX:"+userCtrForGlobal);

				//Search through list to find checked value(ONLY ONE)
				for(var listCtr = 0; listCtr<listOfRadios.length; listCtr++) {
					if(listOfRadios[listCtr].checked == true) sendList.push(listCtr);
				}
			}
			finalize(sendList);
		});
	},
	generateReport: function() {
		var logreportLocation = dialog.showOpenDialog({properties: ['openDirectory']})[0];
		grabGlobalValues();
		createReport(logreportLocation);
	}

}

var finalize = function(sendList) {
	//Grab global variables
	grabGlobalValues();

	//Add mising data to report
	includeMissingData(sendList);

	//Update Global
	ipc.send('finished-report', [reportMap,headers,indvNumbers,false]);
}

var createReport = function(logreportLocation) {
	var workbook = excelbuilder.createWorkbook(logreportLocation, 'sample.xlsx');
	var sheet1 = workbook.createSheet('sheet1', headers.length+10, indvNumbers.length + 10);
	//IMPORTANT - not off by zero. STARTS at 1

	//Create headers
	var row = 1;
	sheet1.set(1,row, "Name");
	sheet1.set(2,row, "Address");

	//Go through for-loop and make headers
	for(var colNum = 0; colNum < headers.length; colNum++) {
		sheet1.set(colNum+3, row, headers[colNum]);
	}


	for(var indvNumbersCtr=0; indvNumbersCtr<indvNumbers.length; indvNumbersCtr++) {
		row++;
		var personReport = reportMap[indvNumbers[indvNumbersCtr]];

		//Set Name
		sheet1.set(1,row, personReport['First name']+" "+personReport['Last name']);
		
		//Input Address
		sheet1.set(2,row, personReport['Address1'] + " "+personReport['City State']);

		//Loop through all possible headers and assign value
		for(var colNum = 0; colNum < headers.length; colNum++) {
			if(typeof(personReport[headers[colNum]]) !== undefined) sheet1.set(colNum+3, row, personReport[headers[colNum]]);
			else sheet1.set(colNum+3, row, "0");
		}
	}

	workbook.save(function(ok) {
		if(!ok) workbook.cancel();
		document.getElementById("report").innerHTML = "Final Report: "+logreportLocation+"/sample.xlsx";
		console.log("Final Report: "+logreportLocation)
	});
}

var grabGlobalValues = function() {
	//Grabbing global values from the main js
	reportMap = require('electron').remote.getGlobal('reportMap');
	headers = require('electron').remote.getGlobal('headers');
	indvNumbers = require('electron').remote.getGlobal('indvNumbers');
}

var includeMissingData = function(sendList) {
	//Grab missing data from global variables
	var duplicateList = require('electron').remote.getGlobal('duplicateList');
	var giverMap = require('electron').remote.getGlobal('giverMap');

	for(var ctr=0; ctr<duplicateList.length; ctr++) {
		//Add Indv Numbers
		var missingPerson = duplicateList[ctr][sendList[ctr]];
		indvNumbers.push(missingPerson['Indiv #']);

		//Add to report map
		var listOfAccount = giverMap[ctr];
		for(var listCtr = 0; listCtr<listOfAccount.length; listCtr++) {
			var account = listOfAccount[listCtr];
			for(var key in account) {
				missingPerson[key] = account[key];
			}
		}

		//Include in report map
		reportMap[missingPerson['Indiv #']] = missingPerson;
	}
}

//Function to generate giver text at beginning
var generateGiverText = function(giverValue) {
	//Creating tag
	var mapValue = document.createElement("p");

	for(var giverCtr = 0; giverCtr<giverValue.length; giverCtr++) {
		//Go through list of accounts
		for(var prop in giverValue[giverCtr]) {
			//It is in a object
			mapValue.innerHTML += prop + ": "+ giverValue[giverCtr][prop] + "<br>";
		}
	}
	//Append text to HTML body
	document.body.appendChild(mapValue);
}

//Function to generate Duplicate Names
var generateDuplicateNames = function(userList, userCtrForGlobal) {
	//Create Tables
	var form = document.createElement("form");
	var userTable = document.createElement("TABLE");
	userTable.setAttribute("id", "membership");

	/*
	Create Headres
	*/
	var headerRow = document.createElement("tr");
	var th = document.createElement("th");
	th.appendChild(document.createTextNode("Selection"));
	headerRow.appendChild(th);

	var th = document.createElement("th");
	th.appendChild(document.createTextNode("Name"));
	headerRow.appendChild(th);

	var th = document.createElement("th");
	th.appendChild(document.createTextNode("Indv Member ID"));
	headerRow.appendChild(th); 

	//Add headers
	form.appendChild(headerRow);
	
	//if list is null then do not loop through
	if(userList == null ) return;
	for(var userCtr = 0; userCtr<userList.length; userCtr++) {
		//Create a new row
		var userRow = document.createElement("tr");
		var user = userList[userCtr];

		//Create Radio Button for selection
		var input = document.createElement("input");
		input.type = "radio";
		input.name = "INDEX:"+userCtrForGlobal;
		input.value = user['Indiv #'];

		//MARK FIRST ONE AS CHECKED
		if(userCtr == 0) input.checked = true;

		//ADD RADIO
		var td = document.createElement('td');
		td.appendChild(input);
		userRow.appendChild(td);
		
		//Add User name
		var td = document.createElement('td');
		td.appendChild(document.createTextNode(user['First name']+" "+user['Last name']));
		userRow.appendChild(td);

		//Add Individual Number
		var td = document.createElement('td');
		td.appendChild(document.createTextNode(user['Indiv #']));
		userRow.appendChild(td);

		//Add row to table
		form.appendChild(userRow);
	}

	//Add to HTML
	userTable.appendChild(form);
	document.body.appendChild(userTable);
	

}