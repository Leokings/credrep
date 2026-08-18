# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
A2=UnicodeDecodeError
A1=OverflowError
Y=min
S=list
R=TypeError
Q=ValueError
O=Exception
M=bool
L=isinstance
K=dict
H=len
C=int
A=str
from genlayer import Address as G,DynArray as AE,Keccak256 as AF,TreeMap as F,gl,u256 as B
import json as T
from datetime import datetime as A3
from typing import Any as I,NoReturn as j,cast as P
c='[EXPECTED]'
d='[EXTERNAL]'
U='[TRANSIENT]'
Z='VOID'
W='YES'
a='NO'
e='OPEN'
AG='RESOLVED'
A4='VOID'
A5='OPEN'
AH='WON'
AI='LOST'
AJ='VOID'
AK=604800
k=2592000
l=604800
m=604800
AL=300000
AM=50000
n='https://farcaster.xyz/'
AN='https://fnames.farcaster.xyz/transfers?name='
AO=300000
AP=100000
o='BIND'
p='REVERIFY'
AQ='UNBOUND'
AR='PENDING'
q='VERIFIED'
r='GRACE'
A6='STALE'
s=20
g=100
A7=604800
A8=86400
h=2592000
AS='https://gamma-api.polymarket.com/markets/'
AT='https://polymarket.com/event/'
t='0x4D97DCd97eC945f40cF65F87097ACe5EA0476045'
AU='https://polygon.drpc.org'
AV='https://polygon.publicnode.com'
AW='dd34de67'
A9='0504c814'
AA=200000
AX=500
AY=2000
AZ=5000
Aa=9500
u=604800
def D(message:A)->j:raise gl.vm.UserError(f"{c} {message}")
def J(message:A)->j:raise gl.vm.UserError(f"{d} {message}")
def E(message:A)->j:raise gl.vm.UserError(f"{U} {message}")
def N()->C:
	raw=A(gl.message_raw['datetime'])
	try:
		parsed=A3.fromisoformat(raw.replace('Z','+00:00'))
		if parsed.tzinfo is None:D('invalid_transaction_datetime')
		return C(parsed.timestamp())
	except(Q,R,A1):D('invalid_transaction_datetime')
def b(value:I)->A:return T.dumps(value,sort_keys=True,separators=(',',':'))
def V(account:G)->A:return A(account).lower()
def Ab(raw:A)->tuple[A,A,A]:
	value=raw.strip()
	if H(value)<20 or H(value)>300 or not value.startswith('https://'):D('invalid_x_proof_url')
	value=value.split('#',1)[0].split('?',1)[0];path=value[8:].strip('/');parts=path.split('/')
	if H(parts)!=4:D('invalid_x_proof_url')
	host=parts[0].lower()
	if host.startswith('www.'):host=host[4:]
	if host not in('x.com','twitter.com'):D('invalid_x_proof_host')
	handle=parts[1]
	if parts[2].lower()!='status':D('invalid_x_proof_url')
	v(handle);tweet_id=parts[3]
	if H(tweet_id)<5 or H(tweet_id)>32 or not tweet_id.isdigit():D('invalid_x_post_id')
	return f"https://x.com/{handle}/status/{tweet_id}",handle,tweet_id
def v(raw:A)->A:
	handle=raw.strip().lstrip('@').lower()
	if H(handle)<1 or H(handle)>15:D('invalid_x_handle')
	for character in handle:
		if not(character.isascii()and(character.isalnum()or character=='_')):D('invalid_x_handle')
	return handle
def AB(raw:A)->A:
	identity_id=raw.strip()
	if H(identity_id)<1 or H(identity_id)>32 or not identity_id.isdigit():E('x_identity_id_unreadable')
	return identity_id
def Ac(html:A,tweet_id:A,challenge:A)->A:
	tweet_marker=f'__typename:"Tweet",rest_id:"{tweet_id}"';start=html.find(tweet_marker)
	if start<0:E('x_proof_post_unreadable')
	next_start=html.find('__typename:"Tweet",rest_id:"',start+H(tweet_marker));hard_end=Y(H(html),start+AM);end=hard_end if next_start<0 else Y(hard_end,next_start);section=html[start:end];header=section[:3000]
	if'reply_to_results:'not in header or'reply_to_user_results:'not in header:E('x_proof_shape_unreadable')
	if'reply_to_results:null'not in header or'reply_to_user_results:null'not in header:D('x_proof_must_be_original_post')
	full_text_marker='full_text:"';text_start=section.find(full_text_marker)
	if text_start<0:E('x_post_text_unreadable')
	text_start+=H(full_text_marker);text_end=section.find('",hashtag_entities:',text_start)
	if text_end<0:E('x_post_text_unreadable')
	if section[text_start:text_end].strip()!=challenge:D('x_challenge_missing')
	identity_marker='__typename:"User",rest_id:"';identity_start=section.find(identity_marker)
	if identity_start<0:E('x_identity_unreadable')
	identity_start+=H(identity_marker);identity_end=section.find('"',identity_start)
	if identity_end<0:E('x_identity_unreadable')
	identity_id=AB(section[identity_start:identity_end]);handle_marker='screen_name:"';handle_start=section.find(handle_marker,identity_end)
	if handle_start<0:E('x_handle_unreadable')
	handle_start+=H(handle_marker);handle_end=section.find('"',handle_start)
	if handle_end<0:E('x_handle_unreadable')
	handle=v(section[handle_start:handle_end]);return b({'handle':handle,'identity_id':identity_id,'tweet_id':tweet_id,'valid':True})
def Ad(raw:A)->K[A,A]:
	try:parsed=T.loads(raw)
	except(Q,R):E('x_consensus_result_unreadable')
	if not L(parsed,K)or parsed.get('valid')is not True:E('x_consensus_result_unreadable')
	identity_id=AB(A(parsed.get('identity_id','')));handle=v(A(parsed.get('handle','')));tweet_id=A(parsed.get('tweet_id','')).strip()
	if H(tweet_id)<5 or H(tweet_id)>32 or not tweet_id.isdigit():E('x_post_id_unreadable')
	return{'identity_id':identity_id,'handle':handle,'tweet_id':tweet_id}
def i(raw:A)->A:
	handle=raw.strip().lstrip('@').lower()
	if H(handle)<1 or H(handle)>32:D('invalid_farcaster_handle')
	for character in handle:
		if not(character.isascii()and(character.isalnum()or character in'-_.')):D('invalid_farcaster_handle')
	if handle[0]in'-_.'or handle[-1]in'-_.':D('invalid_farcaster_handle')
	return handle
def w(raw:I)->A:
	value=A(raw).strip()
	if H(value)<1 or H(value)>20 or not value.isdigit():E('farcaster_fid_unreadable')
	if C(value)<1:E('farcaster_fid_unreadable')
	return value
def x(raw:I,minimum_hex_length:C)->A:
	value=A(raw).strip().lower()
	if not value.startswith('0x')or H(value)<minimum_hex_length+2 or H(value)>42:D('invalid_farcaster_cast_hash')
	for character in value[2:]:
		if not(character.isascii()and(character.isdigit()or character in'abcdef')):D('invalid_farcaster_cast_hash')
	return value
def Ae(raw:A)->tuple[A,A,A]:
	value=raw.strip()
	if H(value)<30 or H(value)>300 or not value.startswith('https://'):D('invalid_farcaster_cast_url')
	value=value.split('#',1)[0].split('?',1)[0];path=value[8:].strip('/');parts=path.split('/')
	if H(parts)!=3 or parts[0].lower()!='farcaster.xyz':D('invalid_farcaster_cast_url')
	handle=i(parts[1]);hash_prefix=x(parts[2],8);return f"{n}{handle}/{hash_prefix}",handle,hash_prefix
def Af(html:A,expected_handle:A,hash_prefix:A,challenge:A)->A:
	marker='id="__NEXT_DATA__"';marker_start=html.find(marker)
	if marker_start<0:E('farcaster_cast_data_unreadable')
	json_start=html.find('>',marker_start);json_end=html.find('</script>',json_start+1)
	if json_start<0 or json_end<0:E('farcaster_cast_data_unreadable')
	try:payload=T.loads(html[json_start+1:json_end]);cast_data=payload['props']['pageProps']['cast']
	except(Q,R,KeyError):E('farcaster_cast_data_unreadable')
	if not L(cast_data,K):E('farcaster_cast_data_unreadable')
	cast_value=P(K[A,I],cast_data);cast_hash=x(cast_value.get('hash',''),40)
	if H(cast_hash)!=42 or not cast_hash.startswith(hash_prefix):D('farcaster_cast_hash_mismatch')
	if A(cast_value.get('text','')).strip()!=challenge:D('farcaster_challenge_missing')
	author=cast_value.get('author')
	if not L(author,K):E('farcaster_author_unreadable')
	author_data=P(K[A,I],author);handle=i(A(author_data.get('username','')))
	if handle!=expected_handle:D('farcaster_cast_author_mismatch')
	fid=w(author_data.get('fid',''));return b({'cast_hash':cast_hash,'fid':fid,'handle':handle,'valid':True})
def Ag(payload:I,handle:A,fid:A)->None:
	if not L(payload,K):J('invalid_farcaster_fname_response')
	transfers=P(K[A,I],payload).get('transfers')
	if not L(transfers,S):J('invalid_farcaster_fname_response')
	if not transfers:
		if handle.endswith('.eth'):return
		E('farcaster_fname_unreadable')
	latest=P(S[I],transfers)[-1]
	if not L(latest,K):J('invalid_farcaster_fname_response')
	transfer=P(K[A,I],latest)
	if i(A(transfer.get('username','')))!=handle:J('farcaster_fname_mismatch')
	if w(transfer.get('to',''))!=fid:J('farcaster_fname_fid_mismatch')
	server_signature=A(transfer.get('server_signature','')).strip().lower()
	if H(server_signature)!=130 or not server_signature.startswith('0x'):J('farcaster_fname_signature_unreadable')
	for character in server_signature[2:]:
		if not(character.isascii()and(character.isdigit()or character in'abcdef')):J('farcaster_fname_signature_unreadable')
def AC(raw:A)->K[A,A]:
	try:parsed=T.loads(raw)
	except(Q,R):E('farcaster_consensus_result_unreadable')
	if not L(parsed,K)or parsed.get('valid')is not True:E('farcaster_consensus_result_unreadable')
	handle=i(A(parsed.get('handle','')));fid=w(parsed.get('fid',''));cast_hash=x(parsed.get('cast_hash',''),40)
	if H(cast_hash)!=42:E('farcaster_cast_hash_unreadable')
	return{'cast_hash':cast_hash,'fid':fid,'handle':handle}
def X(raw:I)->A:
	value=A(raw).strip()
	if H(value)<1 or H(value)>32 or not value.isdigit():D('invalid_market_id')
	return value
def f(raw:I)->A:
	value=A(raw).strip().lower()
	if H(value)!=66 or not value.startswith('0x'):J('invalid_polymarket_condition_id')
	for character in value[2:]:
		if not(character.isascii()and(character.isdigit()or character in'abcdef')):J('invalid_polymarket_condition_id')
	if value[2:]=='0'*64:J('invalid_polymarket_condition_id')
	return value
def Ah(raw:A)->A:
	value=raw.strip().upper()
	if value not in(W,a):D('invalid_prediction')
	return value
def y(account:G,market_id:A)->A:return f"{V(account)}|{market_id}"
def Ai(raw:I)->A:
	value=A(raw).strip().lower()
	if H(value)<1 or H(value)>200:J('invalid_polymarket_slug')
	for character in value:
		if not(character.isascii()and(character.isalnum()or character=='-')):J('invalid_polymarket_slug')
	return value
def AD(raw:I,label:A,minimum:C,maximum:C)->A:
	value=' '.join(A(raw).strip().split())
	if H(value)<minimum:J(f"invalid_polymarket_{label}")
	return value[:maximum]
def Aj(raw:I)->C:
	try:
		parsed=A3.fromisoformat(A(raw).replace('Z','+00:00'))
		if parsed.tzinfo is None:J('invalid_polymarket_end_time')
		return C(parsed.timestamp())
	except(Q,R,A1):J('invalid_polymarket_end_time')
def z(raw:I,label:A)->S[I]:
	parsed=raw
	if L(raw,A):
		try:parsed=T.loads(raw)
		except(Q,R):J(f"invalid_polymarket_{label}")
	if not L(parsed,S):J(f"invalid_polymarket_{label}")
	return P(S[I],parsed)
def Ak(payload:I,expected_id:A,now:C)->A:
	if not L(payload,K):J('invalid_polymarket_response')
	market=P(K[A,I],payload);returned_id=A(market.get('id','')).strip()
	if returned_id!=expected_id:J('polymarket_id_mismatch')
	outcomes=[A(value).strip().upper()for value in z(market.get('outcomes'),'outcomes')]
	if outcomes!=[W,a]:D('market_is_not_binary_yes_no')
	if market.get('active')is not True or market.get('closed')is True:D('market_not_active')
	if market.get('acceptingOrders')is not True:D('market_not_accepting_predictions')
	end_time=Aj(market.get('endDate'))
	if end_time<=now+60:D('market_prediction_window_closed')
	slug=Ai(market.get('slug',''));question=AD(market.get('question',''),'question',5,AX);description=AD(market.get('description','No additional rules supplied.'),'description',1,AY);condition_id=f(market.get('conditionId',''));return b({'condition_id':condition_id,'description':description,'end_time':end_time,'id':returned_id,'question':question,'slug':slug,'source_url':f"{AT}{slug}"})
def Al(raw:I)->A:
	value=A(raw).strip();normalized=value.rstrip('0').rstrip('.')if'.'in value else value
	if normalized in('','0'):return'0'
	if normalized=='0.5':return normalized
	if normalized=='1':return normalized
	E('polymarket_outcome_not_final')
def Am(payload:I,expected_id:A)->A:
	if not L(payload,K):J('invalid_polymarket_response')
	market=P(K[A,I],payload)
	if A(market.get('id','')).strip()!=expected_id:J('polymarket_id_mismatch')
	outcomes=[A(value).strip().upper()for value in z(market.get('outcomes'),'outcomes')]
	if outcomes!=[W,a]:D('market_is_not_binary_yes_no')
	if market.get('closed')is not True:E('polymarket_market_not_resolved')
	condition_id=f(market.get('conditionId',''));prices=[Al(value)for value in z(market.get('outcomePrices'),'outcome_prices')]
	if prices==['1','0']:outcome=W
	elif prices==['0','1']:outcome=a
	elif prices==['0.5','0.5']:outcome=Z
	else:E('polymarket_outcome_not_final')
	return b({'condition_id':condition_id,'id':expected_id,'outcome':outcome})
def A0(payload:I,request_id:C)->C:
	if not L(payload,S):J('invalid_polygon_rpc_response')
	matching:K[A,I]|None=None
	for value in P(S[I],payload):
		if not L(value,K):J('invalid_polygon_rpc_response')
		item=P(K[A,I],value)
		try:item_id=C(item.get('id',-1))
		except(Q,R,A1):J('invalid_polygon_rpc_response')
		if item_id==request_id:matching=item
	if matching is None or matching.get('error')is not None:E('polygon_rpc_call_failed')
	raw_result=matching.get('result')
	if not L(raw_result,A)or not raw_result.startswith('0x'):J('invalid_polygon_rpc_result')
	hexadecimal=raw_result[2:]
	if H(hexadecimal)<1 or H(hexadecimal)>64:J('invalid_polygon_rpc_result')
	for character in hexadecimal.lower():
		if not(character.isascii()and(character.isdigit()or character in'abcdef')):J('invalid_polygon_rpc_result')
	return C(hexadecimal,16)
def An(payload:I,condition_id:A)->A:
	denominator=A0(payload,1);yes_numerator=A0(payload,2);no_numerator=A0(payload,3)
	if denominator==0:E('ctf_condition_not_resolved')
	if yes_numerator+no_numerator!=denominator:E('ctf_payout_vector_invalid')
	if yes_numerator==denominator and no_numerator==0:outcome=W
	elif yes_numerator==0 and no_numerator==denominator:outcome=a
	elif yes_numerator==no_numerator and yes_numerator>0:outcome=Z
	else:E('ctf_payout_vector_unsupported')
	return b({'condition_id':condition_id,'denominator':denominator,'no_numerator':no_numerator,'outcome':outcome,'yes_numerator':yes_numerator})
def Ao(raw:A)->A:
	value=raw.strip().lower()
	if value.startswith('0x'):value=value[2:]
	if H(value)!=64:D('invalid_upgrade_code_hash')
	for character in value:
		if not(character.isascii()and(character.isdigit()or character in'abcdef')):D('invalid_upgrade_code_hash')
	return value
class CredrepForecasts(gl.Contract):
	starting_reputation:B;max_stake_bps:B;user_count:B;market_count:B;prediction_count:B;total_bonus_minted:B;total_reputation_burned:B;total_reputation_recovered:B;registered:F[G,M];reputation_balances:F[G,B];reputation_at_risk:F[G,B];user_prediction_counts:F[G,B];user_open_prediction_counts:F[G,B];user_resolved_counts:F[G,B];user_correct_counts:F[G,B];user_void_counts:F[G,B];user_score_sums:F[G,B];binding_attempts:F[G,B];pending_binding_challenges:F[G,A];pending_binding_expires_at:F[G,B];pending_challenge_purposes:F[G,A];wallet_identity_ids:F[G,A];identity_wallet_addresses:F[A,A];identity_handles:F[G,A];identity_proof_urls:F[G,A];identity_challenges:F[G,A];identity_verified_at:F[G,B];identity_verified_until:F[G,B];recovery_active:F[G,M];recovery_next_at:F[G,B];user_recovered_reputation:F[G,B];market_ids:AE[A];market_exists:F[A,M];market_questions:F[A,A];market_descriptions:F[A,A];market_slugs:F[A,A];market_source_urls:F[A,A];market_end_times:F[A,B];market_statuses:F[A,A];market_outcomes:F[A,A];market_prediction_counts:F[A,B];market_total_staked:F[A,B];market_synced_at:F[A,A];market_resolved_at:F[A,A];position_exists:F[A,M];position_predictions:F[A,A];position_confidence_bps:F[A,B];position_stakes:F[A,B];position_statuses:F[A,A];position_scores_bps:F[A,B];position_created_at:F[A,A];position_settled_at:F[A,A];user_position_ids:F[A,A];upgrade_authority:G;wallet_farcaster_fids:F[G,A];farcaster_fid_wallet_addresses:F[A,A];farcaster_handles:F[G,A];farcaster_proof_urls:F[G,A];market_condition_ids:F[A,A];pending_upgrade_code_hash:A;pending_upgrade_scheduled_at:B;pending_upgrade_execute_after:B
	def __init__(self,starting_reputation:B,max_stake_bps:B):
		initial=C(starting_reputation);stake_limit=C(max_stake_bps)
		if initial<10 or initial>1000000:D('invalid_starting_reputation')
		if stake_limit<100 or stake_limit>5000:D('invalid_max_stake_bps')
		self.starting_reputation=starting_reputation;self.max_stake_bps=max_stake_bps;self.upgrade_authority=gl.message.sender_address;root=gl.storage.Root.get();root.upgraders.get().append(gl.message.sender_address)
	def _activate_user(self,account:G)->None:
		if self.registered.get(account,False):D('user_already_registered')
		self.registered[account]=True;self.reputation_balances[account]=self.starting_reputation;self.user_count=B(C(self.user_count)+1)
	def _identity_status_value(self,account:G,now:C)->A:
		if not self.wallet_identity_ids.get(account,''):
			challenge=self.pending_binding_challenges.get(account,'');expires_at=C(self.pending_binding_expires_at.get(account,B(0)))
			if challenge and now<=expires_at:return AR
			return AQ
		if not self.wallet_farcaster_fids.get(account,''):return A6
		verified_until=C(self.identity_verified_until.get(account,B(0)))
		if now<=verified_until:return q
		if now<=verified_until+l:return r
		return A6
	def _require_identity_active(self,account:G)->None:
		status=self._identity_status_value(account,N())
		if status not in(q,r):D('x_identity_verification_required')
	def _run_x_proof_consensus(self,proof_url:A,challenge:A)->K[A,A]:
		normalized_url,_,tweet_id=Ab(proof_url)
		def leader_fn()->A:
			try:response=gl.nondet.web.get(normalized_url,headers={'Accept':'text/html','Accept-Language':'en-US,en;q=0.9','User-Agent':'Mozilla/5.0 CREDREP-Identity-Verifier/3.0'})
			except O:E('x_proof_fetch_failed')
			if response.status==429 or response.status>=500:E(f"x_proof_http_{response.status}")
			if response.status!=200 or response.body is None:J(f"x_proof_http_{response.status}")
			html=response.body[:AL].decode('utf-8',errors='replace');return Ac(html,tweet_id,challenge)
		def validator_fn(leaders_res:gl.vm.Result[A])->M:
			if not L(leaders_res,gl.vm.Return):
				if not L(leaders_res,gl.vm.UserError):return False
				try:leader_fn();return False
				except gl.vm.UserError as validator_error:
					leader_message=leaders_res.message;validator_message=validator_error.message
					if leader_message.startswith(U):return validator_message.startswith(U)
					if leader_message.startswith(d):return validator_message==leader_message
					if leader_message.startswith(c):return validator_message==leader_message
					return False
				except O:return False
			try:leader_result=A(leaders_res.calldata);validator_result=leader_fn();return leader_result==validator_result
			except O:return False
		result=A(gl.vm.run_nondet_unsafe(leader_fn,validator_fn));parsed=Ad(result)
		if parsed['tweet_id']!=tweet_id:E('x_post_id_mismatch')
		return parsed
	def _run_farcaster_cast_consensus(self,proof_url:A,challenge:A)->K[A,A]:
		normalized_url,expected_handle,hash_prefix=Ae(proof_url);fname_url=f"{AN}{expected_handle}"
		def leader_fn()->A:
			try:response=gl.nondet.web.get(normalized_url,headers={'Accept':'text/html','Accept-Language':'en-US,en;q=0.9','User-Agent':'Twitterbot/1.0'})
			except O:E('farcaster_cast_fetch_failed')
			if response.status==429 or response.status>=500:E(f"farcaster_cast_http_{response.status}")
			if response.status!=200 or response.body is None:J(f"farcaster_cast_http_{response.status}")
			html=response.body[:AO].decode('utf-8',errors='replace');result=Af(html,expected_handle,hash_prefix,challenge);identity=AC(result)
			try:fname_response=gl.nondet.web.get(fname_url,headers={'Accept':'application/json','User-Agent':'CREDREP-Identity-Verifier/4.0'})
			except O:E('farcaster_fname_fetch_failed')
			if fname_response.status==429 or fname_response.status>=500:E(f"farcaster_fname_http_{fname_response.status}")
			if fname_response.status!=200 or fname_response.body is None:J(f"farcaster_fname_http_{fname_response.status}")
			try:payload=T.loads(fname_response.body[:AP].decode('utf-8',errors='strict'))
			except(Q,A2,R):J('invalid_farcaster_fname_response')
			Ag(payload,identity['handle'],identity['fid']);return result
		def validator_fn(leaders_res:gl.vm.Result[A])->M:
			if not L(leaders_res,gl.vm.Return):
				if not L(leaders_res,gl.vm.UserError):return False
				try:leader_fn();return False
				except gl.vm.UserError as validator_error:
					leader_message=leaders_res.message;validator_message=validator_error.message
					if leader_message.startswith(U):return validator_message.startswith(U)
					if leader_message.startswith(d):return validator_message==leader_message
					if leader_message.startswith(c):return validator_message==leader_message
					return False
				except O:return False
			try:return A(leaders_res.calldata)==leader_fn()
			except O:return False
		result=A(gl.vm.run_nondet_unsafe(leader_fn,validator_fn));parsed=AC(result)
		if not parsed['cast_hash'].startswith(hash_prefix):E('farcaster_cast_hash_mismatch')
		if parsed['handle']!=expected_handle:E('farcaster_cast_author_mismatch')
		return parsed
	def _issue_identity_challenge(self,account:G,purpose:A)->None:
		now=N();current_challenge=self.pending_binding_challenges.get(account,'');current_expiry=C(self.pending_binding_expires_at.get(account,B(0)))
		if current_challenge and now<=current_expiry:D('x_verification_challenge_active')
		attempt=C(self.binding_attempts.get(account,B(0)))+1;challenge_label='bind'if purpose==o else'reverify';challenge=f"credrep-{challenge_label}:{C(gl.message.chain_id)}:{V(gl.message.contract_address)}:{V(account)}:{attempt}";self.binding_attempts[account]=B(attempt);self.pending_binding_challenges[account]=challenge;self.pending_binding_expires_at[account]=B(now+AK);self.pending_challenge_purposes[account]=purpose
	def _clear_identity_challenge(self,account:G)->None:self.pending_binding_challenges[account]='';self.pending_binding_expires_at[account]=B(0);self.pending_challenge_purposes[account]=''
	@gl.public.write
	def begin_identity_binding(self)->None:
		account=gl.message.sender_address
		if self.wallet_identity_ids.get(account,'')or self.registered.get(account,False):D('wallet_already_bound')
		self._issue_identity_challenge(account,o)
	@gl.public.write
	def verify_identity_binding(self,proof_url:A,farcaster_proof_url:A)->None:
		account=gl.message.sender_address
		if self.wallet_identity_ids.get(account,'')or self.registered.get(account,False):D('wallet_already_bound')
		challenge=self.pending_binding_challenges.get(account,'');purpose=self.pending_challenge_purposes.get(account,'')
		if not challenge or purpose!=o:D('identity_binding_challenge_missing')
		now=N()
		if now>C(self.pending_binding_expires_at.get(account,B(0))):D('identity_binding_challenge_expired')
		verified=self._run_x_proof_consensus(proof_url,challenge);farcaster_verified=self._run_farcaster_cast_consensus(farcaster_proof_url,challenge);identity_id=verified['identity_id'];existing_wallet=self.identity_wallet_addresses.get(identity_id,'')
		if existing_wallet:D('x_identity_already_bound')
		farcaster_fid=farcaster_verified['fid'];farcaster_existing_wallet=self.farcaster_fid_wallet_addresses.get(farcaster_fid,'')
		if farcaster_existing_wallet:D('farcaster_identity_already_bound')
		handle=verified['handle'];canonical_proof=f"https://x.com/{handle}/status/{verified["tweet_id"]}";self.wallet_identity_ids[account]=identity_id;self.identity_wallet_addresses[identity_id]=V(account);self.identity_handles[account]=handle;self.identity_proof_urls[account]=canonical_proof;farcaster_handle=farcaster_verified['handle'];self.wallet_farcaster_fids[account]=farcaster_fid;self.farcaster_fid_wallet_addresses[farcaster_fid]=V(account);self.farcaster_handles[account]=farcaster_handle;self.farcaster_proof_urls[account]=f"{n}{farcaster_handle}/{farcaster_verified["cast_hash"]}";self.identity_challenges[account]=challenge;self.identity_verified_at[account]=B(now);self.identity_verified_until[account]=B(now+k);self._clear_identity_challenge(account);self._activate_user(account)
	@gl.public.write
	def begin_identity_reverification(self)->None:
		account=gl.message.sender_address;identity_id=self.wallet_identity_ids.get(account,'')
		if not identity_id or not self.registered.get(account,False):D('x_identity_not_bound')
		now=N();verified_until=C(self.identity_verified_until.get(account,B(0)));farcaster_fid=self.wallet_farcaster_fids.get(account,'')
		if farcaster_fid and now+m<verified_until:D('x_reverification_not_due')
		self._issue_identity_challenge(account,p)
	@gl.public.write
	def verify_identity_reverification(self,proof_url:A,farcaster_proof_url:A)->None:
		account=gl.message.sender_address;identity_id=self.wallet_identity_ids.get(account,'')
		if not identity_id:D('x_identity_not_bound')
		challenge=self.pending_binding_challenges.get(account,'');purpose=self.pending_challenge_purposes.get(account,'')
		if not challenge or purpose!=p:D('identity_reverification_challenge_missing')
		now=N()
		if now>C(self.pending_binding_expires_at.get(account,B(0))):D('identity_reverification_challenge_expired')
		verified=self._run_x_proof_consensus(proof_url,challenge);farcaster_verified=self._run_farcaster_cast_consensus(farcaster_proof_url,challenge)
		if verified['identity_id']!=identity_id:D('x_identity_changed')
		farcaster_fid=farcaster_verified['fid'];previous_farcaster_fid=self.wallet_farcaster_fids.get(account,'')
		if previous_farcaster_fid and farcaster_fid!=previous_farcaster_fid:D('farcaster_identity_changed')
		farcaster_existing_wallet=self.farcaster_fid_wallet_addresses.get(farcaster_fid,'')
		if farcaster_existing_wallet and farcaster_existing_wallet!=V(account):D('farcaster_identity_already_bound')
		handle=verified['handle'];self.identity_handles[account]=handle;self.identity_proof_urls[account]=f"https://x.com/{handle}/status/{verified["tweet_id"]}";farcaster_handle=farcaster_verified['handle'];self.wallet_farcaster_fids[account]=farcaster_fid;self.farcaster_fid_wallet_addresses[farcaster_fid]=V(account);self.farcaster_handles[account]=farcaster_handle;self.farcaster_proof_urls[account]=f"{n}{farcaster_handle}/{farcaster_verified["cast_hash"]}";self.identity_challenges[account]=challenge;self.identity_verified_at[account]=B(now);self.identity_verified_until[account]=B(now+k);self._clear_identity_challenge(account)
	def _total_reputation(self,account:G)->C:return C(self.reputation_balances.get(account,B(0)))+C(self.reputation_at_risk.get(account,B(0)))
	def _clear_recovery(self,account:G)->None:self.recovery_active[account]=False;self.recovery_next_at[account]=B(0)
	def _maybe_start_recovery(self,account:G,now:C)->None:
		if self.recovery_active.get(account,False):return
		if C(self.user_open_prediction_counts.get(account,B(0)))!=0:return
		if C(self.reputation_at_risk.get(account,B(0)))!=0:return
		if self._total_reputation(account)>=s:return
		self.recovery_active[account]=True;self.recovery_next_at[account]=B(now+A7)
	def _recoverable_reputation(self,account:G,now:C)->C:
		if not self.recovery_active.get(account,False):return 0
		next_at=C(self.recovery_next_at.get(account,B(0)))
		if next_at==0 or now<next_at:return 0
		total=self._total_reputation(account)
		if total>=g:return 0
		steps=1+(now-next_at)//A8;return Y(steps,g-total)
	@gl.public.write
	def start_recovery(self)->None:
		account=gl.message.sender_address
		if not self.registered.get(account,False):D('user_not_registered')
		self._require_identity_active(account)
		if self.recovery_active.get(account,False):D('recovery_already_active')
		if C(self.user_open_prediction_counts.get(account,B(0)))!=0:D('recovery_requires_no_open_predictions')
		if C(self.reputation_at_risk.get(account,B(0)))!=0:D('recovery_requires_no_reputation_at_risk')
		if self._total_reputation(account)>=s:D('recovery_not_eligible')
		now=N();self.recovery_active[account]=True;self.recovery_next_at[account]=B(now+A7)
	@gl.public.write
	def claim_recovery(self)->None:
		account=gl.message.sender_address
		if not self.registered.get(account,False):D('user_not_registered')
		self._require_identity_active(account)
		if not self.recovery_active.get(account,False):D('recovery_not_active')
		if C(self.user_open_prediction_counts.get(account,B(0)))!=0:D('recovery_requires_no_open_predictions')
		if C(self.reputation_at_risk.get(account,B(0)))!=0:D('recovery_requires_no_reputation_at_risk')
		now=N();amount=self._recoverable_reputation(account,now)
		if amount<1:D('recovery_not_ready')
		balance=C(self.reputation_balances.get(account,B(0)));self.reputation_balances[account]=B(balance+amount);self.user_recovered_reputation[account]=B(C(self.user_recovered_reputation.get(account,B(0)))+amount);self.total_reputation_recovered=B(C(self.total_reputation_recovered)+amount)
		if self._total_reputation(account)>=g:self._clear_recovery(account)
		else:previous_next=C(self.recovery_next_at.get(account,B(0)));self.recovery_next_at[account]=B(previous_next+amount*A8)
	def _run_polymarket_consensus(self,market_id:A,mode:A,now:C)->K[A,I]:
		url=f"{AS}{market_id}"
		def leader_fn()->A:
			try:response=gl.nondet.web.get(url,headers={'Accept':'application/json','User-Agent':'CREDREP-Market-Verifier/1.0'})
			except O:E('polymarket_fetch_failed')
			if response.status==429 or response.status>=500:E(f"polymarket_http_{response.status}")
			if response.status!=200 or response.body is None:J(f"polymarket_http_{response.status}")
			try:payload=T.loads(response.body[:AA].decode('utf-8',errors='strict'))
			except(Q,A2,R):J('invalid_polymarket_response')
			if mode=='ACTIVE':return Ak(payload,market_id,now)
			if mode=='RESOLVE':return Am(payload,market_id)
			D('invalid_market_consensus_mode')
		def validator_fn(leaders_res:gl.vm.Result[A])->M:
			if not L(leaders_res,gl.vm.Return):
				if not L(leaders_res,gl.vm.UserError):return False
				try:leader_fn();return False
				except gl.vm.UserError as validator_error:
					leader_message=leaders_res.message;validator_message=validator_error.message
					if leader_message.startswith(U):return validator_message.startswith(U)
					if leader_message.startswith(d):return validator_message==leader_message
					if leader_message.startswith(c):return validator_message==leader_message
					return False
				except O:return False
			try:return A(leaders_res.calldata)==leader_fn()
			except O:return False
		result=A(gl.vm.run_nondet_unsafe(leader_fn,validator_fn))
		try:parsed=T.loads(result)
		except(Q,R):E('polymarket_consensus_result_unreadable')
		if not L(parsed,K):E('polymarket_consensus_result_unreadable')
		return P(K[A,I],parsed)
	def _run_ctf_consensus(self,condition_id:A)->K[A,I]:
		normalized_condition_id=f(condition_id);condition_hex=normalized_condition_id[2:];zero_index='0'*64;one_index='0'*63+'1';calls=[{'id':1,'jsonrpc':'2.0','method':'eth_call','params':[{'data':'0x'+AW+condition_hex,'to':t},'latest']},{'id':2,'jsonrpc':'2.0','method':'eth_call','params':[{'data':'0x'+A9+condition_hex+zero_index,'to':t},'latest']},{'id':3,'jsonrpc':'2.0','method':'eth_call','params':[{'data':'0x'+A9+condition_hex+one_index,'to':t},'latest']}];body=b(calls).encode('utf-8')
		def leader_fn()->A:
			results:S[A]=[]
			for url in(AU,AV):
				try:response=gl.nondet.web.post(url,body=body,headers={'Accept':'application/json','Content-Type':'application/json','User-Agent':'CREDREP-Settlement-Verifier/1.0'})
				except O:E('polygon_rpc_fetch_failed')
				if response.status==429 or response.status>=500:E(f"polygon_rpc_http_{response.status}")
				if response.status!=200 or response.body is None:J(f"polygon_rpc_http_{response.status}")
				try:payload=T.loads(response.body[:AA].decode('utf-8',errors='strict'))
				except(Q,A2,R):J('invalid_polygon_rpc_response')
				results.append(An(payload,normalized_condition_id))
			if results[0]!=results[1]:E('polygon_rpc_provider_disagreement')
			return results[0]
		def validator_fn(leaders_res:gl.vm.Result[A])->M:
			if not L(leaders_res,gl.vm.Return):
				if not L(leaders_res,gl.vm.UserError):return False
				try:leader_fn();return False
				except gl.vm.UserError as validator_error:
					leader_message=leaders_res.message;validator_message=validator_error.message
					if leader_message.startswith(U):return validator_message.startswith(U)
					if leader_message.startswith(d):return validator_message==leader_message
					if leader_message.startswith(c):return validator_message==leader_message
					return False
				except O:return False
			try:return A(leaders_res.calldata)==leader_fn()
			except O:return False
		result=A(gl.vm.run_nondet_unsafe(leader_fn,validator_fn))
		try:parsed=T.loads(result)
		except(Q,R):E('ctf_consensus_result_unreadable')
		if not L(parsed,K):E('ctf_consensus_result_unreadable')
		if A(parsed.get('condition_id',''))!=normalized_condition_id:E('ctf_condition_id_mismatch')
		return P(K[A,I],parsed)
	def _store_or_verify_market(self,market_id:A,market:K[A,I])->None:
		question=A(market['question']);description=A(market['description']);slug=A(market['slug']);source_url=A(market['source_url']);end_time=C(market['end_time']);condition_id=f(market['condition_id'])
		if self.market_exists.get(market_id,False):
			if self.market_questions[market_id]!=question or self.market_descriptions[market_id]!=description or self.market_slugs[market_id]!=slug or self.market_source_urls[market_id]!=source_url or C(self.market_end_times[market_id])!=end_time:J('polymarket_market_metadata_changed')
			existing_condition_id=self.market_condition_ids.get(market_id,'')
			if existing_condition_id and existing_condition_id!=condition_id:J('polymarket_condition_id_changed')
			if not existing_condition_id:self.market_condition_ids[market_id]=condition_id
			return
		self.market_exists[market_id]=True;self.market_questions[market_id]=question;self.market_descriptions[market_id]=description;self.market_slugs[market_id]=slug;self.market_source_urls[market_id]=source_url;self.market_end_times[market_id]=B(end_time);self.market_condition_ids[market_id]=condition_id;self.market_statuses[market_id]=e;self.market_synced_at[market_id]=A(gl.message_raw['datetime']);self.market_ids.append(market_id);self.market_count=B(C(self.market_count)+1)
	@gl.public.write
	def sync_market(self,market_id:A)->None:normalized_id=X(market_id);now=N();market=self._run_polymarket_consensus(normalized_id,'ACTIVE',now);self._store_or_verify_market(normalized_id,market)
	@gl.public.write
	def make_prediction(self,market_id:A,prediction:A,confidence_bps:B,stake:B)->None:
		account=gl.message.sender_address
		if not self.registered.get(account,False):D('user_not_registered')
		self._require_identity_active(account);normalized_id=X(market_id);selected=Ah(prediction);confidence=C(confidence_bps)
		if confidence<AZ or confidence>Aa:D('confidence_out_of_range')
		key=y(account,normalized_id)
		if self.position_exists.get(key,False):D('prediction_already_exists')
		now=N();market=self._run_polymarket_consensus(normalized_id,'ACTIVE',now);self._store_or_verify_market(normalized_id,market)
		if self.market_statuses[normalized_id]!=e:D('market_not_open')
		wager=C(stake);balance=C(self.reputation_balances.get(account,B(0)))
		if wager<1 or wager>balance:D('insufficient_reputation')
		allowed=max(1,balance*C(self.max_stake_bps)//10000)
		if wager>allowed:D('stake_above_limit')
		self._clear_recovery(account);at_risk=C(self.reputation_at_risk.get(account,B(0)));current_count=C(self.user_prediction_counts.get(account,B(0)));self.reputation_balances[account]=B(balance-wager);self.reputation_at_risk[account]=B(at_risk+wager);self.user_prediction_counts[account]=B(current_count+1);self.user_open_prediction_counts[account]=B(C(self.user_open_prediction_counts.get(account,B(0)))+1);self.position_exists[key]=True;self.position_predictions[key]=selected;self.position_confidence_bps[key]=B(confidence);self.position_stakes[key]=stake;self.position_statuses[key]=A5;self.position_created_at[key]=A(gl.message_raw['datetime']);self.user_position_ids[f"{V(account)}|{current_count}"]=normalized_id;self.market_prediction_counts[normalized_id]=B(C(self.market_prediction_counts.get(normalized_id,B(0)))+1);self.market_total_staked[normalized_id]=B(C(self.market_total_staked.get(normalized_id,B(0)))+wager);self.prediction_count=B(C(self.prediction_count)+1)
	@gl.public.write
	def resolve_market(self,market_id:A)->None:
		normalized_id=X(market_id)
		if not self.market_exists.get(normalized_id,False):D('market_not_found')
		if self.market_statuses[normalized_id]!=e:D('market_not_open')
		now=N()
		if now<C(self.market_end_times[normalized_id]):D('market_resolution_window_not_open')
		resolution=self._run_polymarket_consensus(normalized_id,'RESOLVE',now);gamma_condition_id=f(resolution.get('condition_id',''));stored_condition_id=self.market_condition_ids.get(normalized_id,'')
		if stored_condition_id and stored_condition_id!=gamma_condition_id:J('polymarket_condition_id_changed')
		if not stored_condition_id:self.market_condition_ids[normalized_id]=gamma_condition_id
		ctf_resolution=self._run_ctf_consensus(gamma_condition_id);outcome=A(resolution.get('outcome','')).upper()
		if outcome not in(W,a,Z):E('polymarket_consensus_result_unreadable')
		ctf_outcome=A(ctf_resolution.get('outcome','')).upper()
		if ctf_outcome!=outcome:E('polymarket_ctf_outcome_disagreement')
		self.market_outcomes[normalized_id]=outcome;self.market_statuses[normalized_id]=A4 if outcome==Z else AG;self.market_resolved_at[normalized_id]=A(gl.message_raw['datetime'])
	@gl.public.write
	def void_stale_market(self,market_id:A)->None:
		normalized_id=X(market_id)
		if not self.market_exists.get(normalized_id,False):D('market_not_found')
		if self.market_statuses[normalized_id]!=e:D('market_not_open')
		now=N();void_after=C(self.market_end_times[normalized_id])+h
		if now<void_after:D('market_void_window_not_open')
		self.market_outcomes[normalized_id]=Z;self.market_statuses[normalized_id]=A4;self.market_resolved_at[normalized_id]=A(gl.message_raw['datetime'])
	@gl.public.write
	def schedule_upgrade(self,code_hash:A)->None:
		if gl.message.sender_address!=self.upgrade_authority:D('only_upgrade_authority')
		normalized_hash=Ao(code_hash);now=N();self.pending_upgrade_code_hash=normalized_hash;self.pending_upgrade_scheduled_at=B(now);self.pending_upgrade_execute_after=B(now+u)
	@gl.public.write
	def cancel_upgrade(self)->None:
		if gl.message.sender_address!=self.upgrade_authority:D('only_upgrade_authority')
		if not self.pending_upgrade_code_hash:D('upgrade_not_scheduled')
		self.pending_upgrade_code_hash='';self.pending_upgrade_scheduled_at=B(0);self.pending_upgrade_execute_after=B(0)
	@gl.public.write
	def execute_upgrade(self,new_code:bytes)->None:
		if gl.message.sender_address!=self.upgrade_authority:D('only_upgrade_authority')
		scheduled_hash=self.pending_upgrade_code_hash
		if not scheduled_hash:D('upgrade_not_scheduled')
		if N()<C(self.pending_upgrade_execute_after):D('upgrade_delay_active')
		if H(new_code)==0:D('upgrade_code_required')
		actual_hash=AF(new_code).hexdigest()
		if actual_hash!=scheduled_hash:D('upgrade_code_hash_mismatch')
		self.pending_upgrade_code_hash='';self.pending_upgrade_scheduled_at=B(0);self.pending_upgrade_execute_after=B(0);root=gl.storage.Root.get();code=root.code.get();code.truncate();code.extend(new_code)
	@gl.public.write
	def settle_prediction(self,market_id:A)->None:
		account=gl.message.sender_address;normalized_id=X(market_id)
		if not self.market_exists.get(normalized_id,False):D('market_not_found')
		if self.market_statuses[normalized_id]==e:D('market_not_resolved')
		key=y(account,normalized_id)
		if not self.position_exists.get(key,False):D('prediction_not_found')
		if self.position_statuses[key]!=A5:D('prediction_already_settled')
		wager=C(self.position_stakes[key]);balance=C(self.reputation_balances.get(account,B(0)));at_risk=C(self.reputation_at_risk.get(account,B(0)))
		if at_risk<wager:D('invalid_at_risk_balance')
		open_predictions=C(self.user_open_prediction_counts.get(account,B(0)))
		if open_predictions<1:D('invalid_open_prediction_count')
		self.reputation_at_risk[account]=B(at_risk-wager);self.user_open_prediction_counts[account]=B(open_predictions-1);outcome=self.market_outcomes[normalized_id]
		if outcome==Z:self.reputation_balances[account]=B(balance+wager);self.position_statuses[key]=AJ;self.user_void_counts[account]=B(C(self.user_void_counts.get(account,B(0)))+1)
		else:
			selected=self.position_predictions[key];correct=selected==outcome
			if correct:self.reputation_balances[account]=B(balance+2*wager);self.position_statuses[key]=AH;self.total_bonus_minted=B(C(self.total_bonus_minted)+wager);self.user_correct_counts[account]=B(C(self.user_correct_counts.get(account,B(0)))+1)
			else:self.position_statuses[key]=AI;self.total_reputation_burned=B(C(self.total_reputation_burned)+wager)
			confidence=C(self.position_confidence_bps[key]);probability_yes=confidence if selected==W else 10000-confidence;actual_yes=10000 if outcome==W else 0;error=abs(probability_yes-actual_yes);score=10000-error*error//10000;self.position_scores_bps[key]=B(score);self.user_score_sums[account]=B(C(self.user_score_sums.get(account,B(0)))+score);self.user_resolved_counts[account]=B(C(self.user_resolved_counts.get(account,B(0)))+1)
		self.position_settled_at[key]=A(gl.message_raw['datetime']);self._maybe_start_recovery(account,N())
	@gl.public.view
	def get_identity_challenge(self,account:G)->K[A,I]:challenge=self.pending_binding_challenges.get(account,'');expires_at=C(self.pending_binding_expires_at.get(account,B(0)));now=N();return{'challenge':challenge,'expires_at':expires_at,'active':M(challenge)and now<=expires_at,'attempt':C(self.binding_attempts.get(account,B(0))),'purpose':self.pending_challenge_purposes.get(account,'')}
	@gl.public.view
	def get_identity_status(self,account:G)->K[A,I]:now=N();identity_id=self.wallet_identity_ids.get(account,'');farcaster_fid=self.wallet_farcaster_fids.get(account,'');verified_at=C(self.identity_verified_at.get(account,B(0)));verified_until=C(self.identity_verified_until.get(account,B(0)));status=self._identity_status_value(account,now);pending_challenge=self.pending_binding_challenges.get(account,'');pending_expires_at=C(self.pending_binding_expires_at.get(account,B(0)));pending_purpose=self.pending_challenge_purposes.get(account,'');return{'bound':M(identity_id),'dual_source_bound':M(identity_id)and M(farcaster_fid),'status':status,'handle':self.identity_handles.get(account,''),'identity_id':identity_id,'proof_url':self.identity_proof_urls.get(account,''),'farcaster_fid':farcaster_fid,'farcaster_handle':self.farcaster_handles.get(account,''),'farcaster_proof_url':self.farcaster_proof_urls.get(account,''),'challenge':self.identity_challenges.get(account,''),'verified_at':verified_at,'verified_until':verified_until,'grace_until':verified_until+l if verified_until>0 else 0,'reverification_due':M(identity_id)and(not farcaster_fid or now+m>=verified_until),'reverification_pending':M(pending_challenge)and now<=pending_expires_at and pending_purpose==p,'can_predict':status in(q,r)}
	@gl.public.view
	def get_market(self,market_id:A)->K[A,I]:
		normalized_id=X(market_id)
		if not self.market_exists.get(normalized_id,False):D('market_not_found')
		return{'id':normalized_id,'question':self.market_questions[normalized_id],'description':self.market_descriptions[normalized_id],'slug':self.market_slugs[normalized_id],'source_url':self.market_source_urls[normalized_id],'condition_id':self.market_condition_ids.get(normalized_id,''),'settlement_source':'Polymarket Gamma + Polygon CTF','end_time_unix':C(self.market_end_times[normalized_id]),'void_after_unix':C(self.market_end_times[normalized_id])+h,'status':self.market_statuses[normalized_id],'outcome':self.market_outcomes.get(normalized_id,''),'prediction_count':C(self.market_prediction_counts.get(normalized_id,B(0))),'total_reputation_staked':C(self.market_total_staked.get(normalized_id,B(0))),'synced_at':self.market_synced_at[normalized_id],'resolved_at':self.market_resolved_at.get(normalized_id,'')}
	@gl.public.view
	def get_market_ids(self,offset:B,limit:B)->S[A]:
		start=C(offset);size=Y(C(limit),100);result:S[A]=[];end=Y(start+size,H(self.market_ids))
		for index in range(start,end):result.append(self.market_ids[index])
		return result
	@gl.public.view
	def get_position(self,account:G,market_id:A)->K[A,I]:
		normalized_id=X(market_id);key=y(account,normalized_id)
		if not self.position_exists.get(key,False):return{'exists':False,'market_id':normalized_id}
		return{'exists':True,'market_id':normalized_id,'prediction':self.position_predictions[key],'confidence_bps':C(self.position_confidence_bps[key]),'stake':C(self.position_stakes[key]),'status':self.position_statuses[key],'score_bps':C(self.position_scores_bps.get(key,B(0))),'created_at':self.position_created_at[key],'settled_at':self.position_settled_at.get(key,'')}
	@gl.public.view
	def get_user_position_ids(self,account:G,offset:B,limit:B)->S[A]:
		start=C(offset);size=Y(C(limit),100);total=C(self.user_prediction_counts.get(account,B(0)));end=Y(start+size,total);result:S[A]=[];account_key=V(account)
		for index in range(start,end):result.append(self.user_position_ids[f"{account_key}|{index}"])
		return result
	@gl.public.view
	def get_user_profile(self,account:G)->K[A,I]:available=C(self.reputation_balances.get(account,B(0)));at_risk=C(self.reputation_at_risk.get(account,B(0)));resolved=C(self.user_resolved_counts.get(account,B(0)));correct=C(self.user_correct_counts.get(account,B(0)));now=N();identity_id=self.wallet_identity_ids.get(account,'');farcaster_fid=self.wallet_farcaster_fids.get(account,'');identity_status=self._identity_status_value(account,now);recovery_is_active=self.recovery_active.get(account,False);return{'registered':self.registered.get(account,False),'reputation':available+at_risk,'available_reputation':available,'reputation_at_risk':at_risk,'predictions_made':C(self.user_prediction_counts.get(account,B(0))),'open_predictions':C(self.user_open_prediction_counts.get(account,B(0))),'resolved_predictions':resolved,'correct_predictions':correct,'void_predictions':C(self.user_void_counts.get(account,B(0))),'accuracy_bps':correct*10000//resolved if resolved>0 else 0,'prediction_score_bps':C(self.user_score_sums.get(account,B(0)))//resolved if resolved>0 else 0,'x_identity_bound':M(identity_id),'x_identity_id':identity_id,'x_handle':self.identity_handles.get(account,''),'x_identity_status':identity_status,'x_verified_at':C(self.identity_verified_at.get(account,B(0))),'x_verified_until':C(self.identity_verified_until.get(account,B(0))),'farcaster_identity_bound':M(farcaster_fid),'farcaster_fid':farcaster_fid,'farcaster_handle':self.farcaster_handles.get(account,''),'dual_source_identity_bound':M(identity_id)and M(farcaster_fid),'recovery_active':recovery_is_active,'recovery_next_at':C(self.recovery_next_at.get(account,B(0))),'recoverable_reputation':self._recoverable_reputation(account,now),'recovered_reputation':C(self.user_recovered_reputation.get(account,B(0)))}
	@gl.public.view
	def get_protocol_stats(self)->K[A,C]:return{'users':C(self.user_count),'markets':C(self.market_count),'predictions':C(self.prediction_count),'starting_reputation':C(self.starting_reputation),'max_stake_bps':C(self.max_stake_bps),'total_bonus_minted':C(self.total_bonus_minted),'total_reputation_burned':C(self.total_reputation_burned),'total_reputation_recovered':C(self.total_reputation_recovered),'recovery_trigger_below':s,'recovery_target':g,'identity_verification_validity_seconds':k,'identity_verification_grace_seconds':l,'x_reverification_window_seconds':m,'market_void_timeout_seconds':h,'upgrade_delay_seconds':u}
	@gl.public.view
	def get_governance(self)->K[A,I]:pending_hash=self.pending_upgrade_code_hash;return{'upgradeable':True,'upgrade_authority':A(self.upgrade_authority),'upgrade_delay_seconds':u,'upgrade_pending':M(pending_hash),'pending_upgrade_code_hash':pending_hash,'pending_upgrade_scheduled_at':C(self.pending_upgrade_scheduled_at),'pending_upgrade_execute_after':C(self.pending_upgrade_execute_after),'market_void_timeout_seconds':h}
