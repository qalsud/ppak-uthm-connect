<?php

use App\Models\Conversation;
use App\Models\User;
use Illuminate\Support\Facades\Broadcast;

Broadcast::channel('App.Models.User.{id}', function (User $user, int $id) {
    return $user->id === $id;
});

/**
 * A chat thread. Mirrors the access rules used by the portal controllers:
 * admins oversee every conversation, a parent owns their child's conversation,
 * and a teacher may see any student they can manage.
 */
Broadcast::channel('conversation.{conversation}', function (User $user, Conversation $conversation) {
    $conversation->loadMissing('student');
    $student = $conversation->student;

    return $student !== null && (
        $user->isAdmin()
        || ($user->isParent() && $student->parent_id === $user->id)
        || ($user->isTeacher() && $user->canManage($student))
    );
});
