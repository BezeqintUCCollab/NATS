import axios from 'axios';
import https from 'https';
import {nextError} from '@bzqportal/common';
//const {Tenant, UCCX} = require('./models/index');
//import {decrypt} from './uccx-password';
import exit from 'process';
const parser = require('p3x-xml2json');
//import {parser} from 'p3x-xml2json';
import {NextFunction, RequestHandler} from 'express';
import {scriptParams, parsedApps} from './interfaces/app';


/////////////////////////////// - Callback Service - //////////////////////////////////////////////////

// Make the actual callbak via UCCX API, first URI query param key is the App Trigger
// As a convention the AppTriggerName is "callback".
//
export const makeCallback = async (ip: any, numberToDial: any, Queue = '', Topic = 'Callback Call') => {
  try {
    const callHandler = axios.get(`http://${ip}:9080/callback?tele=${numberToDial}&queue=${Queue}&Topic=${Topic}`).then((result) => {
      console.log(`Rest Call to : callback?tele=${numberToDial}&queue=${Queue}&Topic=${Topic} Done.`);
      return result;
    });
    //console.log("Rest Call to " + numberToDial + " Done.");
    return callHandler;
  } catch (error: any) {
    console.log(error.response);
  }
};

export const getCsqStatus = async (uri: any) => {
  try {
    var promise = axios.get(uri); //.then(result => { /*console.log(result.data);*/ return result; })
    return promise;
  } catch (error) {
    console.log(error);
  }
};
/////////////////////////////// - used for dashboards - //////////////////////////////////////////////////
export const getUccxLiveDataToken = async (liveDataTokenURL: string, username: string, password: string, next: NextFunction) => {
  try {
    const agent = new https.Agent({
      rejectUnauthorized: false,
    });
    const {
      data: {token},
    } = await axios.get(liveDataTokenURL, {
      auth: {username, password},
      httpsAgent: agent,
    });
    if (!token) throw new Error('תקלה בתקשורת מול ה UCCX');
    return token;
  } catch (error) {
    nextError(error, next);
  }
};

export const getApps = async (ip: string, username: string, password: string, tenant: string, next: NextFunction) => {
  try {
    const {
      data: {application: applications},
    } = await axios.get(`http://${ip}/adminapi/application`, {
      auth: {username, password},
    });
    const allAppsArray = await Promise.all(
      applications.map((app: any) => {
        //return axios.get(app.self.replace('+', ' '), {auth: {username, password}}).then((response) => response.data);
		  ////As of August 2020: Modern browsers have support for the String.replaceAll() method
            //return axios.get(app.self.replaceAll("+", " "), { auth: { username, password } }).then(response => response.data);
            //For older browsers
            return axios.get(app.self.split("+").join(" "), { auth: { username, password } }).then(response => response.data);
		
      })
    );
    const relevantApps: any[] = allAppsArray.filter(({ScriptApplication: {scriptParams}}: any) => scriptParams && scriptParams.findIndex((parm: scriptParams) => parm.name === 'portalTree') >= 0);

    let parsedApps: parsedApps[] = [];
    relevantApps.forEach(({ScriptApplication: {scriptParams}, applicationName}) => {
      const index = scriptParams.findIndex((parm: scriptParams) => parm.name === 'portalTree');
      if (index !== -1) {
        const objData = JSON.parse(scriptParams[index].value.slice(1, -1).replace(/`/g, '"'));
        if (objData.hasOwnProperty('Tenant') && objData['Tenant'] === tenant) {
          //Filter to tenant obj
          const {Tenant, ...relevantData} = objData;
          parsedApps.push({name: applicationName, type: 'application', nodes: relevantData});
        }
      }
    });
    return parsedApps;
  } catch (error) {
    nextError(error, next);
  }
};

//get 'refURL' uccx user teams(used for dashboard)
export const TeamsUrlsFromUser = async (ip: string, username: string, password: string, supervisorUsername: string, next: NextFunction) => {
  let teamsOfPrimary: any = [];
  let teamsOfSecond: any = [];
  try {
    const data = (
      await axios.get(`http://${ip}/adminapi/resource/${supervisorUsername}`, {
        auth: {username, password},
      })
    ).data;
    if (data.primarySupervisorOf.hasOwnProperty('supervisorOfTeamName')) {
      data.primarySupervisorOf.supervisorOfTeamName.forEach((data: any) => teamsOfPrimary.push(data));
    }
    if (data.secondarySupervisorOf.hasOwnProperty('supervisorOfTeamName')) {
      data.secondarySupervisorOf.supervisorOfTeamName.forEach((data: any) => teamsOfSecond.push(data));
    }
    let teamUrls: string[] = [];
    if (teamsOfPrimary.length > 0) {
      teamsOfPrimary.forEach(({refURL}: any) => teamUrls.push(refURL));
    }
    if (teamsOfSecond.length > 0) {
      teamsOfSecond.forEach(({refURL}: any) => teamUrls.push(refURL));
    }
    return teamUrls;
  } catch (error) {
    nextError(error, next);
  }
};
//get all csqs 'name' for specific uccx user
export const CsqsFromUser = async (ip: string, username: string, password: string, supervisorUsername: string, next: NextFunction) => {
  try {
    let csqs: string[] = [];
    const teamUrls: string[] = (await TeamsUrlsFromUser(ip, username, password, supervisorUsername, next)) || [''];
    for await (const url of teamUrls) {
      const {data} = await axios.get(url, {auth: {username, password}});
      if (data.hasOwnProperty('csqs')) {
        const {
          csqs: {csq: csqsData},
        } = data;
        csqsData.forEach((csq: any) => csqs.push(csq['@name']));
      }
    }
    return csqs.filter((value: any, index: Number) => csqs.indexOf(value) === index);
  } catch (error) {
    nextError(error, next);
  }
};

//get all csqs 'name' & 'refURL' & 'id' for specific uccx user
export const CsqsFromUserNameAndUrl = async (ip: string, username: string, password: string, supervisorUsername: string, next: NextFunction) => {
  try {
    let csqs: any = [];
    const teamUrls: string[] = (await TeamsUrlsFromUser(ip, username, password, supervisorUsername, next)) || [''];
    for await (const url of teamUrls) {
      const {data} = await axios.get(url, {auth: {username, password}});
      if (data.hasOwnProperty('csqs')) {
        const {
          csqs: {csq: csqsData},
        } = data;
        csqsData.forEach((csq: any) => csqs.push({name: csq['@name'], refURL: csq['refURL'], id: csq['refURL'].split('/')[csq['refURL'].split('/').length - 1]}));
      }
    }
    //remove duplicate
    return csqs.filter((elem: any, index: any, self: any) => self.findIndex((t: any) => t.name === elem.name) === index);
  } catch (error) {
    nextError(error, next);
  }
};

export const getResourceRefUrlFromTeam = async (ip: string, username: string, password: string, supervisorUsername: string, next: any) => {
  try {
    let refUrls: any = [];
    // const teamSelfUrlFromTeams = await getTeamSelfUrlFromTeams(ip, username, password, next);
    const teamSelfUrlFromTeams: string[] = (await TeamsUrlsFromUser(ip, username, password, supervisorUsername, next)) || [''];
    for await (const url of teamSelfUrlFromTeams) {
      const {data} = await axios.get(url, {auth: {username, password}});
      if (data.hasOwnProperty('resources')) {
        const {
          resources: {resource: allResourceData},
        } = data;
        allResourceData.forEach(({refURL}: any) => refUrls.push(refURL));
      }
    }
    return refUrls;
  } catch (error) {
    nextError(error, next);
  }
};

export const getResourceInfoFromUrl = async (ip: string, username: string, password: string, supervisorUsername: string, next: NextFunction) => {
  try {
    let agents: any = {Content: []};
    const resourceRefUrls = await getResourceRefUrlFromTeam(ip, username, password, supervisorUsername, next);
    for await (const url of resourceRefUrls) {
      const {data} = await axios.get(url, {auth: {username, password}});
      agents.Content.push({userID: data.userID, firstName: data.firstName, lastName: data.lastName, extension: data.extension});
    }
    return agents;
  } catch (error) {
    nextError(error, next);
  }
};

export const GetCCRealtimeSchemaData = async (liveDataURL: string, liveDataUsername: string, liveDataPassword: string, TopicName: string, next: any) => {
  try {
    const username = liveDataUsername;
    const password = liveDataPassword;
    //  const { data } = await axios.get(`${liveDataURL}/realtime/${TopicName}`, { // for v12 patch1 (iai)
    const {data} = await axios.get(`${liveDataURL}/realtime/${TopicName}`, {
      auth: {username, password},
    });
    if (!data) throw new Error('תקלה בתקשורת מול ה UCCX');
    return data;
  } catch (error) {
    nextError(error, next);
  }
};
/////////////////////////////// - used for reskilling - //////////////////////////////////////////////////

//get uccx user 'teams' : teamId & teamname
export const getUccxuserTeams = async (ip: string, username: string, password: string, supervisorUsername: string, next: any) => {
  let teamsOfPrimary: any = [];
  let teamsOfSecond: any = [];
  try {
    const data = (
      await axios.get(`http://${ip}/adminapi/resource/${supervisorUsername}`, {
        auth: {username, password},
      })
    ).data;
    if (data.primarySupervisorOf.hasOwnProperty('supervisorOfTeamName')) {
      data.primarySupervisorOf.supervisorOfTeamName.forEach((data: any) => teamsOfPrimary.push(data));
    }
    if (data.secondarySupervisorOf.hasOwnProperty('supervisorOfTeamName')) {
      data.secondarySupervisorOf.supervisorOfTeamName.forEach((data: any) => teamsOfSecond.push(data));
    }
    let teamsData: any = [];
    if (teamsOfPrimary.length > 0) {
      teamsOfPrimary.forEach((tOPrimary: any) => teamsData.push({teamId: tOPrimary['refURL'].split('/')[tOPrimary['refURL'].split('/').length - 1], teamname: tOPrimary['@name']}));
    }
    if (teamsOfSecond.length > 0) {
      teamsOfSecond.forEach((tOSecond: any) => teamsData.push({teamId: tOSecond['refURL'].split('/')[tOSecond['refURL'].split('/').length - 1], teamname: tOSecond['@name']}));
    }
    return teamsData;
  } catch (error) {
    nextError(error, next);
  }
};
//get all skills 'name && id' for specific teamId from csqs refURL
export const SkillsFromTeamId = async (ip: string, username: string, password: string, teamId: any, next: any) => {
  try {
    let skills: any = [];
    const csqUrls = await CsqsUrlFromTeamId(ip, username, password, teamId, next);
    for await (const url of csqUrls) {
      const {data} = await axios.get(url, {auth: {username, password}});
      const {
        poolSpecificInfo: {skillGroup: skillData},
      } = data;
      if (skillData.hasOwnProperty('skillCompetency')) {
        const {skillCompetency} = skillData;
        skillCompetency.forEach(({skillNameUriPair}: any) => skills.push({skillName: skillNameUriPair['@name'], skillID: skillNameUriPair['refURL'].split('/')[skillNameUriPair['refURL'].split('/').length - 1]}));
      }
    }
    return skills;
  } catch (error) {
    nextError(error, next);
  }
};
//get all csqs 'refURL' for specific teamId
export const CsqsUrlFromTeamId = async (ip: string, username: string, password: string, teamId: any, next: any) => {
  const url = `http://${ip}/adminapi/team/${teamId}`;
  try {
    let csqs: any = [];
    const {data} = await axios.get(url, {auth: {username, password}});
    if (data.hasOwnProperty('csqs')) {
      const {
        csqs: {csq: csqsData},
      } = data;
      csqsData.forEach((csq: any) => csqs.push(csq['refURL']));
    }
    return csqs;
  } catch (error) {
    nextError(error, next);
  }
};
//get all resources 'name && userID' for specific teamId
export const ResourcesNameFromTeamId = async (ip: string, username: string, password: string, teamId: any, next: any) => {
  const url = `http://${ip}/adminapi/team/${teamId}`;
  try {
    let resources: any = [];
    const {data} = await axios.get(url, {auth: {username, password}});
    if (data.hasOwnProperty('resources')) {
      const {
        resources: {resource: resourcesData},
      } = data;
      resourcesData.forEach((resource: any) =>
        resources.push({
          agentName: resource['@name'],
          userID: resource['refURL'].split('/')[resource['refURL'].split('/').length - 1],
        })
      );
    }
    return resources;
  } catch (error) {
    nextError(error, next);
  }
};
//get all resources data for specific teamId
export const getResourceTeamIdFromUrl = async (ip: string, username: string, password: string, teamId: any, next: any) => {
  try {
    let agents: any = {Content: []};
    const resourceRefUrls = await ResourcesURLFromTeamId(ip, username, password, teamId, next);
    for await (const url of resourceRefUrls!) {
      const {data} = await axios.get(url, {auth: {username, password}});
      const {team, skillMap} = data;
      const teamIdFromUrl = team['refURL'].split('/')[team['refURL'].split('/').length - 1];
      if (teamIdFromUrl === teamId) {
        const skillsData: any = [];
        if (Object.keys(skillMap).length > 0) {
          const skillCompetency = skillMap['skillCompetency'];
          skillCompetency.forEach(({skillNameUriPair, competencelevel}: any) =>
            skillsData.push({
              skillName: skillNameUriPair['@name'],
              skillLevel: competencelevel,
              skillID: skillNameUriPair['refURL'].split('/')[skillNameUriPair['refURL'].split('/').length - 1],
            })
          );
        }
        agents.Content.push({
          userID: data.userID,
          firstName: data.firstName,
          lastName: data.lastName,
          extension: data.extension,
          teamId: teamIdFromUrl,
          skillsData: skillsData,
        });
      }
    }
    return agents;
  } catch (error) {
    nextError(error, next);
  }
};
//get all resources 'refURL' for specific teamId
const ResourcesURLFromTeamId = async (ip: string, username: string, password: string, teamId: any, next: NextFunction) => {
  const url = `http://${ip}/adminapi/team/${teamId}`;
  try {
    let resourcesRefUrl: any = [];
    const {data} = await axios.get(url, {auth: {username, password}});
    if (data.hasOwnProperty('resources')) {
      const {
        resources: {resource: resourcesData},
      } = data;
      resourcesData.forEach((resource: any) => resourcesRefUrl.push(resource['refURL']));
    }
    return resourcesRefUrl;
  } catch (error) {
    nextError(error, next);
  }
};
//get all skills data
export const getAllSkillsData = async (ip: string, username: string, password: string, teamId: any, next: NextFunction) => {
  try {
    let skills: any = {Content: []};
    const allAgentsData: any = await getResourceTeamIdFromUrl(ip, username, password, teamId, next);
    const allSkillsData = await SkillsFromTeamId(ip, username, password, teamId, next);
    if (allSkillsData.length > 0) {
      allSkillsData.forEach((name: any, skillsIndex: any) => {
        const agentsData: any = [];
        if (allAgentsData.Content.length > 0) {
          allAgentsData.Content.forEach((agentData: any, agentsIndex: any) => {
            if (agentData.skillsData.length > 0) {
              agentData.skillsData.forEach((skillData: any) => {
                if (skillData['skillName'] === name.skillName) {
                  const {firstName, lastName, userID} = allAgentsData.Content[agentsIndex];
                  agentsData.push({
                    agentName: firstName !== '' && lastName !== '' ? firstName + ' ' + lastName : firstName !== '' ? firstName : lastName,
                    agentLevel: skillData['skillLevel'],
                    agentUserID: userID,
                  });
                }
              });
            }
          });
        }
        skills.Content.push({
          skillName: allSkillsData[skillsIndex].skillName,
          skillID: allSkillsData[skillsIndex].skillID,
          agentsData: agentsData,
        });
      });
    }
    return skills;
  } catch (error) {
    nextError(error, next);
  }
};
//get all resource data
export const getResourceData = async (ip: string, username: string, password: string, userID: any, next: NextFunction) => {
  const url = `http://${ip}/adminapi/resource/${userID}`;
  try {
    const {data} = await axios.get(url, {auth: {username, password}});
    return data;
  } catch (error) {
    nextError(error, next);
  }
};
//save skills data for resource
export const saveResourceData = async (ip: string, username: string, password: string, userID: any, updatedResourceData: any, next: NextFunction) => {
  const url = `http://${ip}/adminapi/resource/${userID}`;
  try {
    const {data} = await axios.put(url, updatedResourceData, {auth: {username, password}});
    return data;
  } catch (error) {
    nextError(error, next);
  }
};
// export const getUxxcData: RequestHandler = async (req: any, res, next) => {
//   try {
//     const uccxData: any = {};
//     const {
//       Tenant: tenant,
//       uccxUsername,
//       dbRole: {role},
//       permissions,
//     } = req.req.user;
//     if (uccxUsername === 'לא משוייך' && role !== 'מנהל מערכת') {
//       throw new Error('אינך משוייך למשתמש מרכזיה ולכן לא רשאי לקבל נתונים. רק מנהל מערכת יכול לראות נתונים אם לא משוייך למשתמש מרכזיה');
//     }
//     const dbTenant = await Tenant.findByPk(tenant, {include: [{model: UCCX}]});
//     const {
//       uccx: {ip, username, password: encryptedPassword},
//     } = dbTenant;
//     const password = decrypt(encryptedPassword);
//     uccxData.ip = ip;
//     uccxData.username = username;
//     uccxData.password = password;
//     uccxData.uccxUsername = uccxUsername;
//     return uccxData;
//   } catch (error) {
//     nextError(error, next);
//   }
// };

// get reason Codes
export const getReasonCodes = async (ip: any, username: any, password: any, next: NextFunction) => {
  let allReasonCodes = null;
  // let x2js_inst = new x2js();
  // var res = x2js_inst.xml_str2json("<ReasonCode>    <uri>/finesse/api/ReasonCode/1</uri>    <category>LOGOUT</category>    <code>32767</code>    <label>Device Conflict</label>    <forAll>true</forAll>    <systemCode>true</systemCode>    </ReasonCode>");
  // console.log('res :>> ', res);
  // return res;
  try {
    const agent = new https.Agent({
      rejectUnauthorized: false,
    });
    const data = await axios
      .get(`https://${ip}:8445/finesse/api/ReasonCodes?category=ALL`, {
        auth: {username, password},
        httpsAgent: agent,
      })
      .then((response) => {
        var self: any = this;
        var options = {
          object: true,
        };
        //self.allReasonCodes = parser.toJson(response.data, options);
        allReasonCodes = parser.toJson(response.data, options);
      });
    //return this.allReasonCodes
    return allReasonCodes;
  } catch (error) {
    nextError(error, next);
  }
};
