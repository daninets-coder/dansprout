import { test, expect } from '@playwright/test';
const learnerId='11111111-1111-4111-8111-111111111111';
const siblingId='33333333-3333-4333-8333-333333333333';
const storyId='22222222-2222-4222-8222-222222222222';
const makeStory=()=>({id:storyId,learner_id:learnerId,title:'The Map',theme:'Garden',learning_goal:'Comprehension',created_at:'2026-09-20T12:00:00Z',content:{pages:['Pip found a map by the tree.','The map showed a garden. Pip went there.','Pip planted a seed and shared the map.'],words:[{word:'garden',meaning:'A place to grow plants.'}],questions:[{prompt:'Who found the map?',options:['Pip','An owl'],answer:'Pip',evidence:'Pip found a map by the tree.'},{prompt:'Where did Pip go?',options:['A garden','A ship'],answer:'A garden',evidence:'The map showed a garden.'},{prompt:'What did Pip plant?',options:['A seed','A stone'],answer:'A seed',evidence:'Pip planted a seed and shared the map.'}],meta:{gradeLevel:'2',curriculumStandard:'R2',chapter:1}}});
async function setup(page,{empty=false,failGeneration=false}={}) {
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const story=makeStory(); let learners=empty?[]:[{id:learnerId,first_name:'Pip',age_band:'6-8',reading_level:'2',interests:'gardens'},{id:siblingId,first_name:'Sage',age_band:'6-8',reading_level:'2',interests:'gardens'}]; let stories=empty?[]:[story]; let observation=null; let assessment=null; let bookmark=0; let generationBody=null; let siblingSharingEnabled=false; let shares=[];
 await page.addInitScript(()=>{localStorage.setItem('storySproutToken','test-token');localStorage.setItem('storySproutAccount',JSON.stringify({id:'test-adult',displayName:'Parent',role:'parent'}));});
 await page.route('**/api/**',async route=>{
  const req=route.request(), url=new URL(req.url()), path=url.pathname, body=req.method()==='GET' ? null : req.postDataJSON(); let data={}; let status=200;
  if(path==='/api/me') data={account:{displayName:'Parent',role:'parent'}};
  else if(path==='/api/learners' && req.method()==='POST'){learners=[{id:learnerId,first_name:body.firstName,age_band:body.ageBand,reading_level:body.readingLevel,interests:body.interests}];data={learner:learners[0]};}
  else if(path==='/api/learners') data={learners};
  else if(path==='/api/stories/generate'){generationBody=body;if(failGeneration){status=503;data={error:'Please retry later.'};}else{stories=[story];data={story};}}
  else if(path==='/api/stories') data={stories};
  else if(path==='/api/stories/deleted') data={stories:[]};
  else if(path==='/api/curriculum') data={curriculum:[{standard_code:'R2',strand:'Understand a story',domain:'comprehension',objective:'Explain events.'}]};
  else if(path==='/api/subscription') data={subscription:{plan:'explorer',status:'active'}};
  else if(path==='/api/progress') data={learners:learners.map(l=>({...l,stories_completed:story.completed_at?1:0,assessments_completed:assessment?1:0}))};
  else if(path.startsWith('/api/reading/learners/')) data={activeSeconds:0,observations:observation?[observation]:[],assessments:assessment?[assessment]:[],continueStory:stories.length && !story.completed_at?story:null};
  else if(path==='/api/reading/sharing/settings' && req.method()==='PUT'){siblingSharingEnabled=body.enabled;data={enabled:siblingSharingEnabled};}
  else if(path.startsWith('/api/reading/stories/') && path.endsWith('/sharing') && req.method()==='GET') data={enabled:siblingSharingEnabled,learners:siblingSharingEnabled?learners.filter(l=>l.id!==learnerId).map(({id,first_name})=>({id,first_name})):[]};
  else if(path.startsWith('/api/reading/stories/') && path.endsWith('/sharing') && req.method()==='POST'){shares.push(body.learnerId); data={shared:true,alreadyShared:shares.filter(id=>id===body.learnerId).length>1};}
  else if(path.endsWith('/preferences')) {bookmark=body?.bookmarkedPage ?? bookmark;data={preference:{bookmarkedPage:bookmark,isFavorite:false,rating:null}};}
  else if(path.endsWith('/observation')){observation={...body,story_id:storyId,title:story.title,updated_at:new Date().toISOString()};data={observation};}
  else if(path.endsWith('/complete')) {story.completed_at=new Date().toISOString();data={story};}
  else if(path.endsWith('/assessment')) {assessment={story_id:storyId,title:story.title,standards_evidence:{correct:3,questionCount:3},created_at:new Date().toISOString()}; data={score:100,correct:3,mastered:true};}
  else if(path.endsWith('/narration')) data={url:'/test-audio.mp3'};
  else if(path==='/api/story-shelf') data={favorites:[],topRated:[]};
  await route.fulfill({status,contentType:'application/json',body:JSON.stringify(data)});
 });
 await page.goto('/');
 return {errors,getBody:()=>generationBody};
}
test('public sample works with keyboard and no signup',async({page})=>{
 await page.goto('/');await page.getByRole('button',{name:'Read a sample story'}).click();
 await expect(page.getByRole('dialog')).toBeVisible();await page.locator('#sampleNext').click();await page.locator('#sampleNext').click();await page.locator('#sampleNext').click();
 await expect(page.locator('#sampleTalk')).toBeVisible();await page.keyboard.press('Escape');await expect(page.getByRole('dialog')).toHaveCount(0);await expect(page.locator('#sampleStoryOpen')).toBeFocused();
});
test('new parent creates first learner and gets recoverable generation failure',async({page})=>{
 const state=await setup(page,{empty:true,failGeneration:true});await page.locator('.apiStartStep[data-step="learner"]').click();
 await page.locator('#apiFirstName').fill('Pip');await page.locator('#apiInterests').fill('gardens');await page.locator('#apiReadingLevel').selectOption('2');await page.getByRole('button',{name:'Save learner',exact:true}).click();
 await expect(page.locator('#apiPrompt')).toHaveValue(/gardens/);await expect(page.locator('#apiGradeLevel')).toHaveValue('2');await page.locator('#apiCreate').click();
 await expect(page.locator('#apiGenerationStatus')).toContainText('Please retry later.');await expect(page.locator('#apiCreate')).toBeEnabled();await expect(page.locator('#apiPrompt')).toHaveValue(/gardens/);expect(state.errors).toEqual([]);
});
test('reader resumes, submits a check, saves observation, and reviews a completed story',async({page})=>{
 const state=await setup(page);await page.locator('.open-story').first().click();const dialog=page.getByRole('dialog');await expect(dialog).toBeVisible();await expect(page.locator('#apiStoryAssessment')).toBeHidden();
 await page.locator('#nextPage').click();await page.locator('#apiTextLarger').click();await page.locator('#closeApiStory').click();await page.locator('.open-story').first().click();await expect(page.locator('.storybook-page-count')).toHaveText('Page 2 of 3');
 await expect(page.locator('.storybook-page-text')).toHaveCSS('font-size','26px');await page.locator('#nextPage').click();await page.locator('#nextPage').click();await expect(page.locator('#apiStoryAssessment')).toBeVisible();
 for(let i=0;i<3;i++) await page.locator(`input[name="assessment-${i}"]`).first().check();
 await expect(page.locator('.is-correct')).toHaveCount(0);await page.getByRole('button',{name:'Check answers',exact:true}).click();await expect(page.locator('#apiAssessmentResult')).toContainText('3 of 3');await expect(page.locator('.story-check-feedback')).toContainText('Story evidence:');
 await page.getByText('Parent notes after reading',{exact:true}).click();await page.locator('#readingHelp').selectOption('independent');await page.locator('#readingObservation').fill('Explained the ending.');await page.getByRole('button',{name:'Save observation'}).click();await expect(page.locator('.reader-adult-notes [role="status"]')).toContainText('Observation saved');
 await page.locator('#closeApiStory').click();await page.locator('.open-story').first().click();await expect(page.locator('#apiStoryAssessment')).toBeHidden();await page.getByRole('button',{name:'Review story questions',exact:true}).click();await expect(page.locator('#apiStoryAssessment')).toBeVisible();expect(state.errors).toEqual([]);
});
test('saved stories can share to a sibling within the family',async({page})=>{
 const state=await setup(page);await page.getByRole('button',{name:'Share',exact:true}).first().click();const dialog=page.locator('#apiSiblingShareDialog');
 await expect(dialog).toBeVisible();await page.locator('#apiSiblingSharingEnabled').check();await expect(dialog.getByText('Sibling sharing enabled.')).toBeVisible();
 await page.locator('#apiSiblingRecipient').selectOption(siblingId);await page.getByRole('button',{name:'Share story',exact:true}).click();
 await expect(dialog.getByRole('status')).toContainText('Shared. They can open it from Saved stories.');expect(state.errors).toEqual([]);
});
test('progress dashboard downloads a pdf report',async({page})=>{
 const state=await setup(page);let pdfRequests=0;
 await page.route('**/api/progress-summary.pdf',async route=>{pdfRequests+=1;await route.fulfill({status:200,contentType:'application/pdf',body:'%PDF-1.4\n%'});});
 await page.getByRole('button',{name:'Download progress PDF',exact:true}).click();
 await expect.poll(() => pdfRequests).toBe(1);
 expect(state.errors).toEqual([]);
});
