import twilio from "twilio";

// Find your Account SID and Auth Token at twilio.com/console
// and set the environment variables. See http://twil.io/secure
const accountSid = "";
const authToken = "";
const client = twilio(accountSid, authToken);

async function createCall() {
  const call = await client.calls.create({
    from: "+15675871891",
    to: "+919004200798",
    url: "http://demo.twilio.com/docs/voice.xml",
  });

  console.log(call.sid);
}

createCall();     