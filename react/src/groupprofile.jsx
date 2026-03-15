function GroupProfile() {
  return (
    <div>
      <h1>Hello to your group profile page!</h1>
      <p>This content is for the group profile page</p>

    <div className="sectionContainer">

      <section className="creategroupContainer">
        <h4>Groups</h4>

        <p><a href="groupcreation_q_country.html">Create a group</a></p>
        <p>Search for a group</p>
        <input type="search" id="groupsearch" name="groupsearch" placeholder="Search groups..." />

   
        <p>Your groups: </p>
        <div className="joinedGroupsContainer">
          <ul>
            <li>Prague</li>
            <li>Rome</li>
            <li>Dublin</li>
          </ul>
        </div>
      </section>
    

      <div className="toggleTabsContainer">

        <div className="tab">
          <button className="tablink" onClick={(e) => openTab(e, "chat")}>Chat</button>
          <button className="tablink" onClick={(e) => openTab(e, "recommended")}>Recommended</button>
          <button className="tablink" onClick={(e) => openTab(e, "itinerary")}>Itinerary</button>
        </div>

          <div id="chat" class="tabcontent">
            <h3>Chat</h3>
            <p>Chat needs to be adapted</p>
          </div>

          <div id="recommended" className="tabcontent">
            <h3>Recommended</h3>

            <div className="scrollContainer">           

              <div className="activityCard">
                <figure>
                  <img src="culture.jpg" alt="culture activity" className="activityImg" />
                </figure>    
                <div class="activityName">
                  <h4>Museum x</h4>
                </div>
                <div className="IconContainer">
                  <button className="iconBtn"><i className="fa fa-yes"></i></button>
                  <button className="iconBtn"><i className="fa fa-maybe"></i></button>
                  <button className="iconBtn"><i className="fa fa-no"></i></button>
                </div>
              </div>

              <div className="activityCard">
                <figure>
                  <img src="sports.jpg" alt="sport activity" className="activityImg" />
                </figure>
                <div className="activityName">
                  <h4>Museum y</h4>
                </div>
                <div class="IconContainer">
                  <button className="iconBtn"><i className="fa fa-yes"></i></button>
                  <button className="iconBtn"><i className="fa fa-maybe"></i></button>
                  <button className="iconBtn"><i className="fa fa-no"></i></button>
                </div>
              </div>

              <div className="activityCard">
                <figure>
                  <img src="entertain.jpg" alt="entertainment activity" className="activityImg" />
                </figure>
                <div className="activityName">
                  <h4>Sport x</h4>
                </div>
                <div className="IconContainer">
                  <button className="iconBtn"><i className="fa fa-yes"></i></button>
                  <button className="iconBtn"><i className="fa fa-maybe"></i></button>
                  <button className="iconBtn"><i className="fa fa-no"></i></button>
                </div>
              </div>

              <div className="activityCard">
                <figure>
                  <img src="relax.jpg" alt="relax activity" className="activityImg" />
                </figure>
                <div className="activityName">
                  <h4>Sport y</h4>
                </div>
                <div className="IconContainer">
                  <button className="iconBtn"><i className="fa fa-yes"></i></button>
                  <button className="iconBtn"><i className="fa fa-maybe"></i></button>
                  <button className="iconBtn"><i className="fa fa-no"></i></button>
                </div>
              </div>

              <div className="activityCard">
                <figure>
                  <img src="culture.jpg" alt="culture activity" className="activityImg" />
                </figure>
                <div className="activityName">
                  <h4>Culture</h4>
                </div>
                <div className="IconContainer">
                  <button className="iconBtn"><i className="fa fa-yes"></i></button>
                  <button className="iconBtn"><i className="fa fa-maybe"></i></button>
                  <button className="iconBtn"><i className="fa fa-no"></i></button>
                </div>
              </div>

              <div className="activityCard">
                <figure>
                  <img src="sports.jpg" alt="sport activity" className="activityImg" />
                </figure>
                <div className="activityName">
                  <h4>Sports</h4>
                </div>
                <div className="IconContainer">
                  <button className="iconBtn"><i className="fa fa-yes"></i></button>
                  <button className="iconBtn"><i className="fa fa-maybe"></i></button>
                  <button className="iconBtn"><i className="fa fa-no"></i></button>
                </div>
              </div>

              <div className="activityCard">
                <figure>
                  <img src="entertain.jpg" alt="entertainment activity" className="activityImg" />
                </figure>
                <div className="activityName">
                  <h4>Entertainment</h4>
                </div>
                <div className="IconContainer">
                  <button className="iconBtn"><i className="fa fa-yes"></i></button>
                  <button className="iconBtn"><i className="fa fa-maybe"></i></button>
                  <button className="iconBtn"><i className="fa fa-no"></i></button>
                </div>
              </div>

              <div className="activityCard">
                <figure>
                  <img src="relax.jpg" alt="relax activity" className="activityImg" />
                </figure>
                <div className="activityName">
                  <h4>Relax</h4>
                </div>
                <div className="IconContainer">
                  <button className="iconBtn"><i className="fa fa-yes"></i></button>
                  <button className="iconBtn"><i className="fa fa-maybe"></i></button>
                  <button className="iconBtn"><i className="fa fa-no"></i></button>
                </div>
              </div>
            </div>

          </div>

          <div id="itinerary" className="tabcontent">
            <h3>Itinerary</h3>
            <p>drag/drop function + calendar need to be added</p>
            <input type="date" />
          </div>
        </div>

      </div>

    </div>

  );
}

export default GroupProfile;