google.load('visualization', '1.1', {
	packages: ['calendar']
});

$(document).on('mouseover', '.mini-avatar', function() {
	$('[data-toggle="tooltip"]').tooltip(); 
    $(this).addClass("mini-avatar-hover");
});

$(document).on('mouseout', '.mini-avatar', function(e) {
	$(this).tooltip('hide');
    $(this).removeClass("mini-avatar-hover");
});

$(document).on('click', '.mini-avatar', function(e) {
    $(this).removeClass("mini-avatar-hover");
});

 $(function() {
    $('#read_lines_button').bootstrapToggle();
})

 $(function() {
    $('#read_lines_button').change(function() {
		if($('#read_lines_button').is(':checked')) {
			$('div[name=diff_lines]').css('display', '');
			$('span[name=counting]').css('display', '');
			$('#number_deleted_lines').text(Number(0));
			$('#number_added_lines').text(Number(0));
			if (getInFocusUser().totalAddedLines > 0 || getInFocusUser.totalDeletedLines > 0) {
				showCountedDiffLines();
			} else {
				callCountDifflines();
			}
		} else {
			$('div[name=diff_lines]').css('display', 'none');
		}
    })
})

var teamname = '';
var username = '';
var password = '';

var teammates = [];

function getNewUser() {
	return {
	  username: '',
	  display_name: '',
	  uuid: '',
	  avatar: '',
	  dateCommits: [
		
	  ],
	  repository: [
		{
		  name: '',
		  totalCommitsByDate: {
			
		  },
		  commits: [
			{
			  date: '',
			  diffLink: '',
			  addedLines: 0,
			  deletedLines: 0,
			}
		  ]
		}
	  ],
	  doReadLines: false,
	  totalAddedLines: 0,
	  totalDeletedLines: 0,
	  inFocus: false
	};
}

function chooseTeammate(id) {	
	for (user in teammates) {
		teammates[user].inFocus = false;
	}
	teammates[id].inFocus = true;
	$('#read_lines_button').bootstrapToggle('off');
	processInfos();	
}

function validateEditUser() {	
	$('#div_login' ).slideToggle('slow', function() {
		if( $("#div_login").css("display") == "none" ) {
			validateUser();
			$('#go_edit_buttom').text('Edit');	
			$('#go_edit_buttom').removeClass("btn-success");
			$('#go_edit_buttom').addClass("btn-info");
		} else {
			$('#go_edit_buttom').text('Go!');	
			$('#go_edit_buttom').removeClass("btn-info");
			$('#go_edit_buttom').addClass("btn-success");
		}	
	});
}

function validateUser() {	
	if ($('#user').val() == username && $('#password').val() == password && $('#teamname').val() == teamname) {
			return;
	} else {
		username = $('#user').val();
		password = $('#password').val();
		teamname = $('#teamname').val();
		teammates = [];	
		$('.mini-avatar').remove();
	}
	
	jQuery.ajax({
		type: 'GET',
		url: 'https://bitbucket.org/api/2.0/teams/' + teamname + '/members',
		contentType: 'application/json; charset=utf-8',
		dataType: 'json',
		data: {
			'pagelen': 100
		},
		headers: {
			'Authorization': 'Basic ' + btoa(username + ':' + password)
		},
		success: function(response) {
			for (i = 0; i < response.values.length; ++i) {
				var user = getNewUser();
				user.display_name = response.values[i].display_name;
				user.username = response.values[i].username;
				user.uuid = response.values[i].uuid;
				user.avatar = response.values[i].links.avatar.href;

				if (user.username == username) {
					user.inFocus = true;
					userInFocus = user;						
				} 
				teammates.push(user);
			}			
			getInfos();
		},
		error: function( xhr, status, errorThrown ) {
			console.log( errorThrown );
		}
	});
}

function getInfos() {
	
	var hasNext = false;
	var url = 'https://bitbucket.org/api/2.0/repositories/' + teamname;
	var promisses = [];
	
	try {
		jQuery.ajax({
			type: 'GET',
			url: url,
			contentType: 'application/json; charset=utf-8',
			dataType: 'json',
			data: {
				'pagelen': 100
			},
			headers: {
				'Authorization': 'Basic ' + btoa(username + ':' + password)
			},
			beforeSend: function() {
				$('.loader').css('display', '');
			},
					
			success: function(response) {
				if (response.next) {
					hasNext = true;
					url = response.next;
				} else {
					hasNext = false;
				}

				for (i = 0; i < response.values.length; ++i) {
					promisses.push(getCommitsLinks(response.values[i].links.commits.href));
				}
				
				$.when.apply(this, promisses)
					.then(function () {	
						$('.loader').css('display', 'none');
						processInfos();
						
				});
			}
		});
	} catch (err) {
		console.log( err );
	}
}

function processInfos() {
	var inFocusUser = getInFocusUser(); 
	showUserInfos(inFocusUser);
	showTeammates(inFocusUser);
	countCommitsByRepository(inFocusUser);
	showCommitsInfos(inFocusUser); 
	drawChart(inFocusUser);		
}

function callCountDifflines() {
	var promisses = [];
	this.inFocusUser = inFocusUser;
	
	if (this.inFocusUser.totalAddedLines > 0 || this.inFocusUser.totalDeletedLines > 0) {
		$('#number_deleted_lines').text(Number(inFocusUser.totalDeletedLines).toLocaleString('en'));
		$('#number_added_lines').text(Number(inFocusUser.totalAddedLines).toLocaleString('en'));
		$('span[name=counting]').css('display', 'none');		
	}

	for (r = 0; r < this.inFocusUser.repository.length; ++r) {
		for (c = 0; c < this.inFocusUser.repository[r].commits.length; ++c) {
			if($('#read_lines_button').is(':checked')) {
				promisses.push(countCommitLines(inFocusUser, r, c));
			}
		}
	}

	$.when.apply(this, promisses)
		.then(function () {		
			showCountedDiffLines();
	});
}

function showCountedDiffLines() {
	$('#number_deleted_lines').text(Number(inFocusUser.totalDeletedLines).toLocaleString('en'));
	$('#number_added_lines').text(Number(inFocusUser.totalAddedLines).toLocaleString('en'));
	$('span[name=counting]').css('display', 'none');
}

function getCommitsLinks(link) {
	var hasNext = false;
	var url = link;
	do {
		try {
			return jQuery.ajax({
				type: 'GET',
				url: url,
				contentType: 'application/json; charset=utf-8',
				dataType: 'json',
				data: {
					'pagelen': 100
				},
				headers: {
					'Authorization': 'Basic ' + btoa(username + ':' + password)
				},
				success: function(response) {
					if (response.next) {
						url = response.next;
						hasNext = true;					
					} else {
						hasNext = false;
					}
					findUsersCommits(response);					
				}
			});
		} catch (err) {
			console.log( err );
		}
	} while(hasNext);
}

function findUsersCommits(response) {
	for (i = 0; i < response.values.length; ++i) {
		var ownCommit = false;
		try {	
			//this part is just to compare user with the owner of commit.	
			var commitUser = { raw: response.values[i].author.raw,
							   username: '',
							   display_name: '',
							   uuid: ''};
				
			if ( response.values[i].author.hasOwnProperty('user') ) {				
				if ( response.values[i].author.user.hasOwnProperty('username') ) { 
					commitUser.username = response.values[i].author.user.username;
				}
				if ( response.values[i].author.user.hasOwnProperty('display_name') ) { 
					commitUser.display_name = response.values[i].author.user.display_name;
				}	
				if ( response.values[i].author.user.hasOwnProperty('uuid') ) { 
					commitUser.uuid = response.values[i].author.user.uuid;
				}	
			}			
			//
			
			for (var key in commitUser) {
				for (var id in teammates) {					
					if ( (commitUser.raw).indexOf(teammates[id].display_name) >= 0 || ( teammates[id].hasOwnProperty(key) && teammates[id][key] == commitUser[key] )) {
						var newCommit = {name:response.values[i].repository.name, totalCommitsByDate:{}, commits:[{date:getDateCommits(response.values[i].date),diffLink:response.values[i].links.diff.href,addedLines:0,deletedLines:0,countFinish:false}]};						
						saveCommit(teammates[id], newCommit);
						ownCommit = true;
						break;
					}
				}
				if(ownCommit) {
					break;
				}				
			}			
		} catch (err) {
			console.log( err );
		}
	}
}

function saveCommit(userInFocus, newCommit) {
	if (userInFocus.repository[0].name == "") {
		userInFocus.repository.shift();
		userInFocus.repository.push(newCommit);
		return;
	}

	for (x = 0; x < userInFocus.repository.length; ++x) {
		if (userInFocus.repository[x].name == newCommit.name) {
			userInFocus.repository[x].commits.push(newCommit.commits[0]);
			return;
		} 
	}	
	userInFocus.repository.push(newCommit);	
}

function countCommitLines(inFocusUser, idRepository, idCommit) {
	try {
		return jQuery.ajax({
			type: 'GET',
			url: inFocusUser.repository[idRepository].commits[idCommit].diffLink,
			contentType: 'text/plain; charset=utf-8',
			accept: '*/*',
			headers: {
				'Authorization': 'Basic ' + btoa(username + ':' + password)
			},
			success: function(response) {
				var yourLines = response.split("\n");
				for (i = 0; i < yourLines.length; ++i) {
					if (yourLines[i].charAt(0) == '-' && yourLines[i].charAt(1) != '-') {
						inFocusUser.repository[idRepository].commits[idCommit].deletedLines++;
						inFocusUser.totalDeletedLines++;
					}else if (yourLines[i].charAt(0) == '+' && yourLines[i].charAt(1) != '+') {
						inFocusUser.repository[idRepository].commits[idCommit].addedLines++;
						inFocusUser.totalAddedLines++;
					} 
				}				
				$('#number_deleted_lines').text(Number(inFocusUser.totalDeletedLines).toLocaleString('en'));
				$('#number_added_lines').text(Number(inFocusUser.totalAddedLines).toLocaleString('en'));
			}
		});
	} catch (err) {
		console.log( err );
	}	
}

function getDateCommits(date) {
	var date = new Date(date);
	var day = date.getDate();
	var month = date.getMonth() + 1;
	var year = date.getFullYear();
	return (year + ', ' + month + ', ' + day);
}

function getInFocusUser() {
	for (i = 0; i < teammates.length; ++i) {
		if (teammates[i].inFocus) {
			return teammates[i];
		}
	} 
}

function countCommitsByRepository(inFocusUser) {
	this.inFocusUser = inFocusUser;
	for (i = 0; i < this.inFocusUser.repository.length; ++i) {
		for (c = 0; c < this.inFocusUser.repository[i].commits.length; ++c) {
			if (!this.inFocusUser.repository[i].totalCommitsByDate[this.inFocusUser.repository[i].commits[c].date]) {
				this.inFocusUser.repository[i].totalCommitsByDate[this.inFocusUser.repository[i].commits[c].date] = 1;				
			} else {
				++this.inFocusUser.repository[i].totalCommitsByDate[this.inFocusUser.repository[i].commits[c].date];	
			}
		
		}
	}
}

function countTotalCommits(inFocusUser) {
	this.inFocusUser = inFocusUser;
	var total = 0;
	for (i = 0; i < this.inFocusUser.repository.length; ++i) {
		if (this.inFocusUser.repository[i].name != '') {
			total += this.inFocusUser.repository[i].commits.length;			
		}
	}
	return total;
}

function drawChart(inFocusUser) {
	this.inFocusUser = inFocusUser;
	var dataTable = new google.visualization.DataTable();
	
	dataTable.addColumn({
		type: 'date',
		id: 'Date'
	});
	dataTable.addColumn({
		type: 'number',
		id: 'Less/More'
	});
	for (r in this.inFocusUser.repository) {
		for (c in this.inFocusUser.repository[r].totalCommitsByDate) {
			dataTable.addRows([
				[new Date(c), this.inFocusUser.repository[r].totalCommitsByDate[c]]
			]);
		}
	}	

	var chart = new google.visualization.Calendar(document.getElementById('calendar_basic'));

	var options = {
		legend: { position: 'bottom' },
		colorAxis: {colors:['#afeeee','#63ace5']},
		height: getGraphSize(this.inFocusUser),
		calendar: {       
			cellSize: 13,	
			cellColor: {
				opacity: 0
			},
			monthOutlineColor: {
				strokeOpacity: 0.0,
				strokeWidth: 2
			},
			unusedMonthOutlineColor: {
				strokeOpacity: 0.0,
				strokeWidth: 1
			},
			yearLabel: {			
				fontSize: 20,
				color: '#c9c9c9',
			}
		}
	};

	chart.draw(dataTable, options);
}

function getGraphSize(inFocusUser) {
	this.inFocusUser = inFocusUser;
	var justYears = [];
	
	for (r = 0; r < this.inFocusUser.repository.length; ++r) {		
		for (c = 0; c < this.inFocusUser.repository[r].totalCommitsByDate.length; ++c) {
			var year = this.inFocusUser.repository[r].totalCommitsByDate[c].split(', ')[0];
		
			if (justYears.indexOf(year) >= 0 ) {
				justYears.push(year);
			}
		}
	}
	return (justYears.length * 115) + 150;	
}

function changeAvatar(inFocusUser) {
	var user = inFocusUser;
	$('#avatar').animate({
	opacity: 0.0
	}, 500, function() {
		$('#avatar').attr('src',user.avatar);
		$('#avatar').animate({
			opacity: 1
		},500)	
	});
}

function showUserInfos(inFocusUser) {
	this.inFocusUser = inFocusUser;
	changeAvatar(this.inFocusUser);	
	$('#display_user_name').text(this.inFocusUser.display_name) ;
	$('#display_user_login').text(this.inFocusUser.username) ;
	$('#userInfos').css('display', '');
}

function showCommitsInfos(inFocusUser) {
	this.inFocusUser = inFocusUser;
	$('#commitsInfos').css('display', '');
	$('#graph').css('display', '');
	
		
	$('#number_commits').text(countTotalCommits(inFocusUser));	
	$('#painelBody').height( getGraphSize(this.inFocusUser) );
}



function showTeammates(idToAdd, idToRemove) {
	if (idToAdd != undefined  && idToRemove != undefined ) {
		id = "#mini-avatar-id-" + idToRemove;
		$(id).css('display', 'none');
		var html = " <img src='" + teammates[idToAdd].avatar + "' class='mini-avatar' data-toggle='tooltip' title='" + teammates[idToAdd].username + "' id='mini-avatar-id-" + idToAdd + "' onClick='chooseTeammate(" + idToAdd + ")' /> ";		
		$('#mini_avatar_container').append( html );	
		return;
	}			
		
	if (teammates.length > 0) {
		$('#teammates').css('display', '');
		for (i = 0; i < teammates.length; ++i) {
			if ((!teammates[i].inFocus && !$('#mini-avatar-id-' + i).length)) {
				var html = " <img src='" + teammates[i].avatar + "' class='mini-avatar' data-toggle='tooltip' title='" + teammates[i].username + "' id='mini-avatar-id-" + i + "' onClick='chooseTeammate(" + i + ")' /> ";		
				$('#mini_avatar_container').append( html );		
			} else if (teammates[i].inFocus && ($('#mini-avatar-id-' + i).length)) {
				$('#mini-avatar-id-' + i).tooltip('hide');
				$('#mini-avatar-id-' + i).remove();
			}
		}			
	}
}






