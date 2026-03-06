// function displaying the individual tabs on the group profile page
function openTab(evt, tabName) {
    // we declare all variables
    var i, tabcontent, tablinks;

    // et all elements with class="tabcontent" and hide them
    tabcontent = document.getElementsByClassName("tabcontent");
    for (i = 0; i < tabcontent.length; i++) {  
        tabcontent[i].style.display = "none";
    }

    // Get all elements with class="tablinks" and remove the class "active"
    tablinks = document.getElementsByClassName("tablink");
    for (i = 0; i < tablinks.length; i++) {
      tablinks[i].className = tablinks[i].className.replace(" active", "");
    }

    // Show the current tab, and add an "active" class to the button that opened the tab
    document.getElementById(tabName).style.display = "block";
    evt.currentTarget.className += " active";
}

// code for the slider on the travel length
// code for displaying the chosen value in the slider
var slider = document.getElementById("slideRange");
var output = document.getElementById("length");
output.innerHTML = slider.value; // Display the default slider value

// Update the current slider value (each time you drag the slider handle)
slider.oninput = function() {
    output.innerHTML = this.value;
}

// code for opening and closing the pop up chat
function openForm() {
    document.getElementById("chatpopup").style.display = "block";
}

function closeForm() {
    document.getElementById("chatpopup").style.display = "none";
}


// function for the tabs on the settings page
function openSetting(evt, settingname) {
  // Declare all variables
  var i, tabcontent, tablinks;

  // Get all elements with class="tabcontent" and hide them
  tabcontent = document.getElementsByClassName("tabcontent");
  for (i = 0; i < tabcontent.length; i++) {
    tabcontent[i].style.display = "none";
  }

  // Get all elements with class="tablinks" and remove the class "active"
  tablinks = document.getElementsByClassName("tablinks");
  for (i = 0; i < tablinks.length; i++) {
    tablinks[i].className = tablinks[i].className.replace(" active", "");
  }

  // Show the current tab, and add an "active" class to the link that opened the tab
  document.getElementById(settingname).style.display = "block";
  evt.currentTarget.className += " active";
}
