import {sb,configured,esc,message} from './app.js';
const login=document.getElementById('login-screen'),dash=document.getElementById('dashboard');
let user=null,admin=false;
function toggle(){login.hidden=admin;dash.hidden=!admin;}
async function check(){
 if(!configured){message('login-status','Add Supabase URL and publishable key to assets/js/config.js.');return;}
 const {data:{user:u}}=await sb.auth.getUser();user=u;
 if(user){const {data,error}=await sb.from('admins').select('user_id').eq('user_id',user.id).maybeSingle();admin=!error&&!!data;}
 else admin=false;
 toggle();if(admin)await loadAll();else if(user)message('login-status','This account has not been granted admin access.');
}
const formatDate=x=>x?new Date(x).toLocaleDateString():'';
async function listRows(table){
 const {data,error}=await sb.from(table).select('*').order('created_at',{ascending:false}).limit(200);if(error)throw error;return data||[];
}
async function loadAll(){
 try{
 for(const table of ['portfolio','artists']){
  const data=await listRows(table);const target=document.getElementById(table+'-rows');target.replaceChildren();
  data.forEach(x=>{const tr=document.createElement('tr');const title=document.createElement('td');title.textContent=x.title||x.name;
   const sub=document.createElement('td');sub.textContent=x.category||x.genre;
   const actions=document.createElement('td');const btn=document.createElement('button');btn.textContent='Delete';btn.className='btn btn-sm btn-outline-danger';btn.onclick=()=>removeRecord(table,x);actions.append(btn);tr.append(title,sub,actions);target.append(tr);});
 }
 const enquiries=await listRows('enquiries');const t=document.getElementById('enquiry-rows');t.replaceChildren();
 enquiries.forEach(x=>{const tr=document.createElement('tr');for(const v of [formatDate(x.created_at),x.name,x.email,x.phone||'',x.service||'',x.message,x.status]){const td=document.createElement('td');td.textContent=v;tr.append(td)}
 const td=document.createElement('td'),s=document.createElement('select');s.className='form-select form-select-sm';for(const status of ['new','contacted','closed']){const o=new Option(status,status);s.add(o)}s.value=x.status;s.onchange=async()=>{const {error}=await sb.from('enquiries').update({status:s.value}).eq('id',x.id);if(error)message('admin-status',error.message)};td.append(s);tr.append(td);t.append(tr)});
 }catch(e){message('admin-status','Unable to load dashboard: '+e.message);}
}
async function removeRecord(table,x){if(!confirm('Delete this item?'))return;
 const {error}=await sb.from(table).delete().eq('id',x.id);if(error){message('admin-status',error.message);return;}
 if(x.storage_path)await sb.storage.from('media').remove([x.storage_path]);await loadAll();
}
for(const table of ['portfolio','artists'])document.getElementById(table+'-form')?.addEventListener('submit',async e=>{
 e.preventDefault();const form=e.currentTarget,b=form.querySelector('[type=submit]');b.disabled=true;
 try{
  const fields=Object.fromEntries(new FormData(form).entries());const file=fields.image_file;
  if(!(file instanceof File)||!file.size)throw Error('Choose an image.');
  if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>5*1024*1024)throw Error('Choose a JPEG, PNG or WebP smaller than 5 MB.');
  const extension={"image/jpeg":"jpg","image/png":"png","image/webp":"webp"}[file.type];
  const path=`${table}/${crypto.randomUUID()}.${extension}`;
  const {error:up}=await sb.storage.from('media').upload(path,file,{contentType:file.type,upsert:false});if(up)throw up;
  const image=sb.storage.from('media').getPublicUrl(path).data.publicUrl;
  const record=table==='portfolio'?{title:fields.title,category:fields.category,description:fields.description,image,storage_path:path}:{name:fields.name,genre:fields.genre,description:fields.description,image,storage_path:path};
  const {error}=await sb.from(table).insert(record);if(error){await sb.storage.from('media').remove([path]);throw error;}
  form.reset();message('admin-status','Item published.',true);await loadAll();
 }catch(err){message('admin-status',err.message)}finally{b.disabled=false;}
});
document.getElementById('login-form')?.addEventListener('submit',async e=>{e.preventDefault();const f=e.currentTarget;
 if(!sb)return;const b=f.querySelector('button');b.disabled=true;
 const {error}=await sb.auth.signInWithPassword({email:f.email.value,password:f.password.value});b.disabled=false;
 if(error){message('login-status','Sign in failed. Check your credentials.');return;}await check();
});
document.getElementById('logout')?.addEventListener('click',async()=>{await sb.auth.signOut();user=null;admin=false;toggle();});
document.getElementById('password-form')?.addEventListener('submit',async e=>{e.preventDefault();const f=e.currentTarget;if(f.password.value.length<12){message('admin-status','Use at least 12 characters.');return;}const {error}=await sb.auth.updateUser({password:f.password.value});message('admin-status',error?error.message:'Password changed.',!error);if(!error)f.reset();});
check();
